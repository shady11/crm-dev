import {NotificationEntityType, NotificationType, Prisma} from "@/generated/prisma/client";
import type {DbClient} from "@/database/prisma.types";
import type {RbacService} from "@/modules/rbac/rbac.service";
import type {NotificationsService} from "@/modules/notifications/notifications.service";

/**
 * Who is asked to decide a discount request of `percent`: the same
 * threshold that made it PENDING decides who gets asked. A request a
 * branch-scoped approver's own band already covers goes to that branch's
 * holder(s); otherwise it needs someone whose ceiling isn't branch-scoped
 * (company-wide). Used when the request is made (DealsService.reserveUnit)
 * and when it is chased (DiscountApprovalReminderService), so both reach
 * the same people.
 */
export async function findDiscountApprovers(
    db: DbClient,
    rbacService: RbacService,
    params: {companyId: string; branchId: string | null; percent: Prisma.Decimal | number},
): Promise<{id: string; fullName: string}[]> {
    const percent = new Prisma.Decimal(params.percent);
    const approverRoles = await rbacService.findApproverRoles(params.companyId, "deals.approve_discount");
    const qualifying = approverRoles.filter(
        (r) => r.discountLimit === null || new Prisma.Decimal(r.discountLimit).greaterThanOrEqualTo(percent),
    );
    const branchScopedRoleIds = qualifying.filter((r) => r.isBranchScoped).map((r) => r.id);
    const companyWideRoleIds = qualifying.filter((r) => !r.isBranchScoped).map((r) => r.id);
    const targetRoleIds = branchScopedRoleIds.length > 0 ? branchScopedRoleIds : companyWideRoleIds;

    return db.user.findMany({
        where: {
            companyId: params.companyId,
            roleId: {in: targetRoleIds},
            isActive: true,
            ...(branchScopedRoleIds.length > 0 ? {branchId: params.branchId} : {}),
        },
        select: {id: true, fullName: true},
        orderBy: {fullName: "asc"},
    });
}

export async function findDiscountApproverIds(
    db: DbClient,
    rbacService: RbacService,
    params: {companyId: string; branchId: string | null; percent: Prisma.Decimal | number},
): Promise<string[]> {
    const approvers = await findDiscountApprovers(db, rbacService, params);
    return approvers.map((a) => a.id);
}

/**
 * Whether this viewer may decide a request of `percent`: they hold
 * deals.approve_discount and the request is within their own Role
 * discountLimit (null = no ceiling). The API refuses anything else, so the
 * UI asks the same question before offering Approve / Reject (SH-1).
 */
export function canDecideDiscount(
    percent: Prisma.Decimal | number,
    viewer: {canApprove: boolean; discountLimit: number | null | undefined},
): boolean {
    if (!viewer.canApprove) return false;
    const limit = viewer.discountLimit === undefined ? 0 : viewer.discountLimit;
    if (limit === null) return true;
    return new Prisma.Decimal(percent).lessThanOrEqualTo(new Prisma.Decimal(limit));
}

type DiscountRequestOutcome =
    | {outcome: "approved" | "rejected"; byName: string}
    | {outcome: "withdrawn"};

/**
 * Once a discount request is decided — or the reservation it sat on is
 * cancelled or lapses — every "Discount approval needed" notification sent
 * for it (reminders included) is rewritten to say what happened, and stops
 * counting as unread. Best-effort: the decision has already committed.
 */
export async function resolveDiscountRequestNotifications(
    notifications: NotificationsService,
    deal: {id: string; companyId: string; dealNumber: string; requestedDiscountPercent: Prisma.Decimal | number | null},
    result: DiscountRequestOutcome,
) {
    const percent = Number(deal.requestedDiscountPercent ?? 0);
    const base = {
        companyId: deal.companyId,
        type: NotificationType.DISCOUNT_APPROVAL_REQUESTED,
        entityType: NotificationEntityType.DEAL,
        entityId: deal.id,
        resolvedType: NotificationType.DISCOUNT_DECIDED,
    };

    if (result.outcome === "withdrawn") {
        return notifications.resolveForEntity({
            ...base,
            title: `Discount request for deal ${deal.dealNumber} no longer needs a decision`,
            templateKey: "discountRequestWithdrawn",
            params: {dealNumber: deal.dealNumber, percent},
        });
    }

    const params = {dealNumber: deal.dealNumber, percent, byName: result.byName};
    return result.outcome === "approved"
        ? notifications.resolveForEntity({
            ...base,
            title: `Discount for deal ${deal.dealNumber} approved by ${result.byName}`,
            templateKey: "discountRequestApproved",
            params,
        })
        : notifications.resolveForEntity({
            ...base,
            title: `Discount for deal ${deal.dealNumber} rejected by ${result.byName}`,
            templateKey: "discountRequestRejected",
            params,
        });
}

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import {
    ActivityAction,
    ActivityType,
    NotificationEntityType,
    NotificationType,
    Prisma,
    UnitPriceRequestStatus,
} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {hasPermission} from "@/common/utils/permissions.util";
import {formatMoney} from "@/modules/deals/deal.constants";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {RbacService} from "@/modules/rbac/rbac.service";
import {activityText} from "@/modules/activities/activity-templates";
import {QueryUnitPriceRequestsDto} from "./dto/query-unit-price-requests.dto";

const REQUEST_INCLUDE = {
    unit: {
        select: {
            id: true, number: true, price: true, status: true,
            project: {select: {id: true, name: true}},
            block: {select: {id: true, name: true}},
        },
    },
    requestedBy: {select: {id: true, fullName: true}},
    decidedBy: {select: {id: true, fullName: true}},
} satisfies Prisma.UnitPriceRequestInclude;

type UnitForPricing = {id: string; number: string; price: Prisma.Decimal; project: {name: string}};

/**
 * SH-2: a unit's list price is what discount approval compares a booking
 * against, so lowering it is a discount nobody approved. Changing it needs
 * units.edit_price; unless the person also holds units.approve_price, the
 * change waits as a request for someone who does. Every change, approved
 * or made directly by an approver, is kept here as the unit's price
 * history, and approvers are told about each one.
 */
@Injectable()
export class UnitPriceRequestsService {
    private readonly logger = new Logger(UnitPriceRequestsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly rbacService: RbacService,
    ) {}

    /**
     * Called by UnitsService.update when a save carries a different price.
     * Returns "apply" when the caller should write the new price now (the
     * actor approves prices), or the pending request when it must wait.
     */
    async handlePriceChange(user: AuthUser, unit: UnitForPricing, newPrice: number):
        Promise<{outcome: "apply"} | {outcome: "requested"; requestId: string}> {
        const companyId = this.companyOf(user);

        if (!hasPermission(user, "units.edit_price")) {
            throw new ForbiddenException("Changing a unit's list price needs the units.edit_price permission.");
        }

        const fromPrice = Number(unit.price);

        if (hasPermission(user, "units.approve_price")) {
            // Recorded as an already-approved change, so the price history
            // is complete; the caller writes the price itself.
            await this.prisma.$transaction(async (db) => {
                await this.cancelPending(db, unit.id);
                await db.unitPriceRequest.create({
                    data: {
                        companyId, unitId: unit.id,
                        status: UnitPriceRequestStatus.APPROVED,
                        currentPrice: fromPrice, requestedPrice: newPrice,
                        requestedById: user.id, decidedById: user.id, decidedAt: new Date(),
                    },
                });
            });
            await this.notifyApprovers(user, {
                exclude: user.id,
                type: NotificationType.UNIT_PRICE_CHANGED,
                entityType: NotificationEntityType.UNIT,
                entityId: unit.id,
                title: `${user.name} changed the price of unit ${unit.number} (${unit.project.name}) from ${formatMoney(fromPrice, user.company?.currency)} to ${formatMoney(newPrice, user.company?.currency)}`,
                templateKey: "unitPriceChanged",
                params: {...this.unitParams(user, unit), fromPrice, toPrice: newPrice, byName: user.name},
            });
            return {outcome: "apply"};
        }

        const request = await this.prisma.$transaction(async (db) => {
            await this.cancelPending(db, unit.id);
            const created = await db.unitPriceRequest.create({
                data: {
                    companyId, unitId: unit.id,
                    currentPrice: fromPrice, requestedPrice: newPrice,
                    requestedById: user.id,
                },
            });
            await db.activity.create({
                data: {
                    companyId, userId: user.id, unitId: unit.id,
                    action: ActivityAction.UPDATED_UNIT,
                    type: ActivityType.UNIT_UPDATED,
                    ...activityText("unitPriceChangeRequested", {unit: unit.number}),
                    metadata: {priceRequestId: created.id, price: {from: fromPrice, to: newPrice}},
                },
            });
            return created;
        });

        await this.notifyApprovers(user, {
            type: NotificationType.UNIT_PRICE_CHANGE_REQUESTED,
            entityType: NotificationEntityType.UNIT_PRICE_REQUEST,
            entityId: request.id,
            title: `${user.name} asks to change the price of unit ${unit.number} (${unit.project.name}) from ${formatMoney(fromPrice, user.company?.currency)} to ${formatMoney(newPrice, user.company?.currency)}`,
            templateKey: "unitPriceChangeRequested",
            params: {...this.unitParams(user, unit), fromPrice, toPrice: newPrice, byName: user.name},
        });

        return {outcome: "requested", requestId: request.id};
    }

    async findAll(user: AuthUser, query: QueryUnitPriceRequestsDto) {
        const companyId = this.companyOf(user);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const where: Prisma.UnitPriceRequestWhereInput = {
            companyId,
            ...(query.status ? {status: query.status} : {status: {not: UnitPriceRequestStatus.CANCELLED}}),
            ...(query.unitId ? {unitId: query.unitId} : {}),
            // Someone who can only ask sees their own requests.
            ...(hasPermission(user, "units.approve_price") ? {} : {requestedById: user.id}),
        };

        const [items, total] = await Promise.all([
            this.prisma.unitPriceRequest.findMany({
                where,
                include: REQUEST_INCLUDE,
                // Pending first, then newest.
                orderBy: [{status: "asc"}, {createdAt: "desc"}],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.unitPriceRequest.count({where}),
        ]);

        return {
            items: items.map((r) => this.toResponse(r)),
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }

    /** The pending request on a unit, for the unit's own page; null when none. */
    async findPendingForUnit(companyId: string, unitId: string) {
        const request = await this.prisma.unitPriceRequest.findFirst({
            where: {companyId, unitId, status: UnitPriceRequestStatus.PENDING},
            include: REQUEST_INCLUDE,
        });
        return request ? this.toResponse(request) : null;
    }

    async approve(user: AuthUser, id: string) {
        const companyId = this.companyOf(user);
        const request = await this.findPendingOrThrow(companyId, id);

        await this.prisma.$transaction(async (db) => {
            const claimed = await db.unitPriceRequest.updateMany({
                where: {id, status: UnitPriceRequestStatus.PENDING},
                data: {status: UnitPriceRequestStatus.APPROVED, decidedById: user.id, decidedAt: new Date()},
            });
            if (claimed.count === 0) throw new ConflictException("This price change was already decided.");

            await db.unit.update({where: {id: request.unitId}, data: {price: request.requestedPrice}});
            await db.activity.create({
                data: {
                    companyId, userId: user.id, unitId: request.unitId,
                    action: ActivityAction.UPDATED_UNIT,
                    type: ActivityType.UNIT_UPDATED,
                    ...activityText("unitPriceChangeApproved", {unit: request.unit.number}),
                    metadata: {
                        priceRequestId: id,
                        requestedById: request.requestedById,
                        price: {from: Number(request.unit.price), to: Number(request.requestedPrice)},
                    },
                },
            });
        });

        await this.afterDecision(user, request, "approved");
        return this.toResponse(await this.prisma.unitPriceRequest.findUniqueOrThrow({where: {id}, include: REQUEST_INCLUDE}));
    }

    async reject(user: AuthUser, id: string, reason: string) {
        const companyId = this.companyOf(user);
        const trimmed = reason?.trim();
        if (!trimmed) throw new BadRequestException("Give a reason for rejecting the price change.");
        const request = await this.findPendingOrThrow(companyId, id);

        await this.prisma.$transaction(async (db) => {
            const claimed = await db.unitPriceRequest.updateMany({
                where: {id, status: UnitPriceRequestStatus.PENDING},
                data: {
                    status: UnitPriceRequestStatus.REJECTED,
                    decidedById: user.id, decidedAt: new Date(), rejectionReason: trimmed,
                },
            });
            if (claimed.count === 0) throw new ConflictException("This price change was already decided.");

            await db.activity.create({
                data: {
                    companyId, userId: user.id, unitId: request.unitId,
                    action: ActivityAction.UPDATED_UNIT,
                    type: ActivityType.UNIT_UPDATED,
                    ...activityText("unitPriceChangeRejected", {unit: request.unit.number}),
                    metadata: {priceRequestId: id, requestedById: request.requestedById, reason: trimmed},
                },
            });
        });

        await this.afterDecision(user, request, "rejected", trimmed);
        return this.toResponse(await this.prisma.unitPriceRequest.findUniqueOrThrow({where: {id}, include: REQUEST_INCLUDE}));
    }

    // ------------------------------------------------------------------

    private companyOf(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        return user.companyId;
    }

    private async cancelPending(db: Prisma.TransactionClient, unitId: string) {
        await db.unitPriceRequest.updateMany({
            where: {unitId, status: UnitPriceRequestStatus.PENDING},
            data: {status: UnitPriceRequestStatus.CANCELLED},
        });
    }

    private async findPendingOrThrow(companyId: string, id: string) {
        const request = await this.prisma.unitPriceRequest.findFirst({
            where: {id, companyId},
            include: {unit: {select: {number: true, price: true, project: {select: {name: true}}}}},
        });
        if (!request) throw new NotFoundException("Price change not found");
        if (request.status !== UnitPriceRequestStatus.PENDING) {
            throw new ConflictException("This price change was already decided.");
        }
        return request;
    }

    private unitParams(user: AuthUser, unit: {number: string; project: {name: string}}) {
        return {unit: unit.number, project: unit.project.name, currency: user.company?.currency ?? null};
    }

    /**
     * Everyone in the company whose role approves prices, minus `exclude`.
     * Best-effort: the change itself has already been saved.
     */
    private async notifyApprovers(
        user: AuthUser,
        params: {exclude?: string} & Omit<Parameters<NotificationsService["create"]>[0], "companyId" | "userId">,
    ) {
        const {exclude, ...notification} = params;
        try {
            const companyId = this.companyOf(user);
            const roleIds = await this.rbacService.findRoleIdsWithPermission(companyId, "units.approve_price");
            const approvers = await this.prisma.user.findMany({
                where: {companyId, roleId: {in: roleIds}, isActive: true, deletedAt: null, ...(exclude ? {id: {not: exclude}} : {})},
                select: {id: true},
            });
            for (const approver of approvers) {
                await this.notifications.create({...notification, companyId, userId: approver.id} as Parameters<NotificationsService["create"]>[0]);
            }
        } catch (error) {
            this.logger.error("Failed to notify price approvers", error instanceof Error ? error.stack : String(error));
        }
    }

    private async afterDecision(
        user: AuthUser,
        request: {id: string; companyId: string; requestedById: string; requestedPrice: Prisma.Decimal; unit: {number: string; project: {name: string}}},
        outcome: "approved" | "rejected",
        reason?: string,
    ) {
        const base = this.unitParams(user, request.unit);
        const unitLabel = `unit ${request.unit.number} (${request.unit.project.name})`;
        try {
            await this.notifications.resolveForEntity({
                companyId: request.companyId,
                type: NotificationType.UNIT_PRICE_CHANGE_REQUESTED,
                entityType: NotificationEntityType.UNIT_PRICE_REQUEST,
                entityId: request.id,
                resolvedType: NotificationType.UNIT_PRICE_CHANGE_DECIDED,
                ...(outcome === "approved"
                    ? {
                        title: `Price change for ${unitLabel} approved by ${user.name}`,
                        templateKey: "unitPriceRequestApproved" as const,
                        params: {...base, byName: user.name},
                    }
                    : {
                        title: `Price change for ${unitLabel} rejected by ${user.name}`,
                        templateKey: "unitPriceRequestRejected" as const,
                        params: {...base, byName: user.name},
                    }),
            });

            if (request.requestedById !== user.id) {
                await this.notifications.create({
                    companyId: request.companyId,
                    userId: request.requestedById,
                    type: NotificationType.UNIT_PRICE_CHANGE_DECIDED,
                    entityType: NotificationEntityType.UNIT_PRICE_REQUEST,
                    entityId: request.id,
                    ...(outcome === "approved"
                        ? {
                            title: `${user.name} approved the new price of ${unitLabel}: ${formatMoney(Number(request.requestedPrice), user.company?.currency)}`,
                            templateKey: "unitPriceChangeApproved" as const,
                            params: {...base, toPrice: Number(request.requestedPrice), byName: user.name},
                        }
                        : {
                            title: `${user.name} rejected the price change for ${unitLabel}`,
                            message: reason,
                            templateKey: "unitPriceChangeRejected" as const,
                            params: {...base, byName: user.name, reason: reason ?? ""},
                        }),
                });
            }
        } catch (error) {
            this.logger.error(`Failed to send price decision notifications for ${request.id}`, error instanceof Error ? error.stack : String(error));
        }
    }

    private toResponse(request: Prisma.UnitPriceRequestGetPayload<{include: typeof REQUEST_INCLUDE}>) {
        return {
            ...request,
            currentPrice: Number(request.currentPrice),
            requestedPrice: Number(request.requestedPrice),
            unit: {...request.unit, price: Number(request.unit.price)},
        };
    }
}

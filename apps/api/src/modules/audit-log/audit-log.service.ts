import {ForbiddenException, Injectable, Logger} from "@nestjs/common";
import {Prisma, AuditAction} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryAuditLogsDto} from "./dto/query-audit-logs.dto";
import {QueryOwnLoginsDto} from "./dto/query-own-logins.dto";

const LOGIN_ACTIONS: AuditAction[] = [AuditAction.LOGIN_SUCCEEDED, AuditAction.LOGIN_FAILED];

export type RecordAuditLogInput = {
    actorId: string;
    actorEmail: string;
    action: AuditAction;
    targetType: string;
    targetId?: string;
    companyId?: string;
    metadata?: Prisma.InputJsonValue;
};

/**
 * Append-only platform-operator audit trail. Separate from Activity (the
 * per-tenant CRM feed, which requires a companyId and is about deals/leads,
 * not SUPER_ADMIN actions).
 *
 * record() never throws on its own account failing to write would be worse
 * than an unlogged action for a support workflow already in progress, so
 * callers await it but a failure here does not roll back the action itself.
 */
@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private readonly prisma: PrismaService) {}

    async record(input: RecordAuditLogInput) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    actorId: input.actorId,
                    actorEmail: input.actorEmail,
                    action: input.action,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    companyId: input.companyId,
                    metadata: input.metadata,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to write audit log entry for action ${input.action}`, error);
        }
    }

    async findAll(query: QueryAuditLogsDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const where: Prisma.AuditLogWhereInput = {};

        if (query.companyId) where.companyId = query.companyId;
        if (query.actorId) where.actorId = query.actorId;
        if (query.action) where.action = query.action;
        else if (query.hideLogins) where.action = {notIn: LOGIN_ACTIONS};

        if (query.dateFrom || query.dateTo) {
            where.createdAt = {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {createdAt: "desc"},
                include: {
                    company: {select: {id: true, name: true}},
                },
            }),
            this.prisma.auditLog.count({where}),
        ]);

        const names = await this.targetNames(items);

        return {
            items: items.map((item) => ({
                ...item,
                targetName: item.targetId ? (names.get(`${item.targetType}:${item.targetId}`) ?? null) : null,
            })),
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }

    /**
     * SA-11: what each row is about, by name rather than by id: a user's
     * name, a company's, a role's, a setting option's code. One query per
     * kind of target on the page. Deleted users and companies keep their
     * rows, so their names still resolve.
     */
    private async targetNames(items: {targetType: string; targetId: string | null}[]) {
        const idsOf = (type: string) => [
            ...new Set(items.filter((item) => item.targetType === type && item.targetId).map((item) => item.targetId!)),
        ];
        const userIds = idsOf("User");
        const companyIds = idsOf("Company");
        const roleIds = idsOf("Role");
        const optionIds = idsOf("SettingOption");

        const [users, companies, roles, options] = await Promise.all([
            userIds.length
                ? this.prisma.user.findMany({where: {id: {in: userIds}}, select: {id: true, fullName: true}})
                : [],
            companyIds.length
                ? this.prisma.company.findMany({where: {id: {in: companyIds}}, select: {id: true, name: true}})
                : [],
            roleIds.length ? this.prisma.role.findMany({where: {id: {in: roleIds}}, select: {id: true, name: true}}) : [],
            optionIds.length
                ? this.prisma.settingOption.findMany({where: {id: {in: optionIds}}, select: {id: true, code: true}})
                : [],
        ]);

        return new Map<string, string>([
            ...users.map((u) => [`User:${u.id}`, u.fullName] as [string, string]),
            ...companies.map((c) => [`Company:${c.id}`, c.name] as [string, string]),
            ...roles.map((r) => [`Role:${r.id}`, r.name] as [string, string]),
            ...options.map((o) => [`SettingOption:${o.id}`, o.code] as [string, string]),
        ]);
    }

    /**
     * The scoped counterpart to findAll(): a tenant's own login activity
     * only (LOGIN_SUCCEEDED/LOGIN_FAILED for their own companyId), never
     * another tenant's and never the wider platform-operator action types
     * findAll() exposes. Reached through audit_log.view_own, a different
     * permission from audit_log.view — granted to COMPANY_ADMIN by default,
     * not just the SUPER_ADMIN bypass. See AuditLogController.
     */
    async findOwnLogins(actor: AuthUser, query: QueryOwnLoginsDto) {
        if (!actor.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const where: Prisma.AuditLogWhereInput = {
            companyId: actor.companyId,
            action: {in: [AuditAction.LOGIN_SUCCEEDED, AuditAction.LOGIN_FAILED]},
        };

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {createdAt: "desc"},
            }),
            this.prisma.auditLog.count({where}),
        ]);

        return {
            items,
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }
}

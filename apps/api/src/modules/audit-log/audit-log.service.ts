import {ForbiddenException, Injectable, Logger} from "@nestjs/common";
import {Prisma, AuditAction} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryAuditLogsDto} from "./dto/query-audit-logs.dto";
import {QueryOwnLoginsDto} from "./dto/query-own-logins.dto";

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

        return {
            items,
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
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

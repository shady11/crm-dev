import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {AuditAction, AuditLogEntry} from "../types/audit-log.types";

export type GetAuditLogsParams = {
    page?: number;
    limit?: number;
    companyId?: string;
    actorId?: string;
    action?: AuditAction;
    dateFrom?: string;
    dateTo?: string;
};

export async function getAuditLogs(params?: GetAuditLogsParams) {
    const response = await api.get<PaginatedResponse<AuditLogEntry>>("/audit-logs", {params});
    return response.data;
}

export type GetOwnLoginsParams = {
    page?: number;
    limit?: number;
};

// Tenant-scoped counterpart to getAuditLogs: a COMPANY_ADMIN's own users'
// LOGIN_SUCCEEDED/LOGIN_FAILED activity only, via audit_log.view_own —
// never reaches the platform-wide /audit-logs endpoint above.
export async function getOwnLogins(params?: GetOwnLoginsParams) {
    const response = await api.get<PaginatedResponse<AuditLogEntry>>("/audit-logs/logins", {params});
    return response.data;
}

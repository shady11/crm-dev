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

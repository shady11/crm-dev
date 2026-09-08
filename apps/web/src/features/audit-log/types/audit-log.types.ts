export type AuditAction =
    | "TENANT_CREATED"
    | "TENANT_SUSPENDED"
    | "TENANT_RESUMED"
    | "TENANT_DELETED"
    | "TENANT_USER_DEACTIVATED"
    | "TENANT_USER_REACTIVATED"
    | "TENANT_USER_PASSWORD_RESET"
    | "IMPERSONATION_STARTED"
    | "IMPERSONATION_ENDED"
    | "IMPERSONATED_ACTION";

export const AUDIT_ACTIONS: AuditAction[] = [
    "TENANT_CREATED",
    "TENANT_SUSPENDED",
    "TENANT_RESUMED",
    "TENANT_DELETED",
    "TENANT_USER_DEACTIVATED",
    "TENANT_USER_REACTIVATED",
    "TENANT_USER_PASSWORD_RESET",
    "IMPERSONATION_STARTED",
    "IMPERSONATION_ENDED",
    "IMPERSONATED_ACTION",
];

export type AuditLogEntry = {
    id: string;
    actorId: string;
    actorEmail: string;
    action: AuditAction;
    targetType: string;
    targetId: string | null;
    companyId: string | null;
    company: {id: string; name: string} | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
};

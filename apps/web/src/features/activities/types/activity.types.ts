export type ActivityUser = {
    id: string;
    fullName: string;
    branchId: string | null;
} | null;

export type Activity = {
    id: string;
    type: string;
    action: string;
    title: string;
    templateKey?: string | null;
    templateParams?: Record<string, unknown> | null;
    description: string | null;
    createdAt: string;
    user: ActivityUser;
    // SA-2: the platform admin, when done while viewing the app as `user`.
    impersonatedBy?: { id: string; fullName: string } | null;
    // The records the row is about; null when it isn't about one.
    lead: { id: string; fullName: string } | null;
    client: { id: string; fullName: string } | null;
    deal: { id: string; dealNumber: string; client: { id: string; fullName: string } | null } | null;
    task: { id: string; title: string } | null;
    unit: { id: string; number: string; project: { id: string; name: string } | null } | null;
    project: { id: string; name: string } | null;
};

export const ACTIVITY_SUBJECTS = ["lead", "client", "deal", "task", "inventory"] as const;
export type ActivitySubject = (typeof ACTIVITY_SUBJECTS)[number];

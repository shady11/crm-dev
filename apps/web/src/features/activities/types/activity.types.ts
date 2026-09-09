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
    description: string | null;
    createdAt: string;
    user: ActivityUser;
};

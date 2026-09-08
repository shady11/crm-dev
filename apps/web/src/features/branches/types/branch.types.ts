export type Branch = {
    id: string;
    companyId: string;
    name: string;
    city: string | null;
    address: string | null;
    phone: string | null;
    /** Non-null means deactivated. Reversible, unlike deletion — there is no delete path. */
    deactivatedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export function isDeactivated(branch: Pick<Branch, "deactivatedAt">): boolean {
    return branch.deactivatedAt !== null;
}

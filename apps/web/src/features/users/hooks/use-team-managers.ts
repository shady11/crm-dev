import {useManagers} from "@/features/users/hooks/use-managers.ts";

// SH-A1: candidates for the "reassign to" picker: the sales team on the
// given branch, matching what the backend's reassign endpoints allow. Since
// SH-12 that includes the Sales Head, who can take a lead or deal over.
export function useTeamManagers(branchId?: string | null) {
    const managers = useManagers();
    const items = branchId ? managers.data.filter((candidate) => candidate.branchId === branchId) : [];
    return {...managers, data: items};
}

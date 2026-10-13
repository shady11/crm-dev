import {useManagers} from "@/features/users/hooks/use-managers.ts";

// SH-A1: candidates for the "reassign to" picker: the sales team on the
// given branch, matching what the backend's reassign endpoints allow.
export function useTeamManagers(branchId?: string | null) {
    const managers = useManagers();
    // Team leads are left out: the reassign endpoints only accept an
    // individual contributor.
    const items = branchId
        ? managers.data.filter((candidate) => candidate.branchId === branchId && !candidate.isTeamLead)
        : [];
    return {...managers, data: items};
}

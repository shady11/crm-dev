import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {Activity} from "../types/activity.types";

export type GetActivitiesParams = {
    page?: number;
    limit?: number;
    // Admin-only cross-branch filter; ignored server-side for a branch-scoped
    // caller (SALES_HEAD/SALES_MANAGER), whose own branch is already applied.
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
};

export async function getActivities(params?: GetActivitiesParams) {
    const response = await api.get<PaginatedResponse<Activity>>("/activities", {params});
    return response.data;
}

export const paths = {
    home: "/",
    login: "/login",
    dashboard: "/dashboard",
    leads: "/leads",
    clients: {
        root: "/clients",
        detail: (clientId: string) => `/clients/${clientId}`,
    },
    users: "/users",
    branches: {
        root: "/branches",
        detail: (branchId: string) => `/branches/${branchId}`,
    },
    settings: "/settings",
    profile: "/profile",
    projects: {
        root: "/projects",
        detail: (projectId: string) => `/projects/${projectId}`,
        overview: (projectId: string) => `/projects/${projectId}/overview`,
        builder: (projectId: string) => `/projects/${projectId}/builder`,
        chessboard: {
            root: (projectId: string) => `/projects/${projectId}/chessboard`,
            block: (projectId: string, blockId: string) =>
                `/projects/${projectId}/chessboard/${blockId}`,
            entrance: (projectId: string, blockId: string, entranceId: string) =>
                `/projects/${projectId}/chessboard/${blockId}/${entranceId}`,
        },
        sales: (projectId: string) => `/projects/${projectId}/sales`,
    },
    deals: {
        root: "/deals",
        detail: (dealId: string) => `/deals/${dealId}`,
    },
    tasks: {
        root: "/tasks",
    },
    units: {
        infoSheet: (unitId: string) => `/units/${unitId}/info-sheet`,
    },
} as const;
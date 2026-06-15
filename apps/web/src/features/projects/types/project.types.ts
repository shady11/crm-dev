export type Project = {
    id: string;
    name: string;
    address: string | null;
    status: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        blocks: number;
        units: number;
    };
};
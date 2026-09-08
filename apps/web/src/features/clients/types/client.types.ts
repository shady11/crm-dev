export interface Client {
    id: string;
    fullName: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    passport: string | null;
    pin: string | null;
    companyId: string;
    branchId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    _count: {
        leads: number;
        deals: number;
    };
}
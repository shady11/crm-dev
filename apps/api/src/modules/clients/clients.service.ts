import {PrismaService} from "@/database/prisma.service";
import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryClientsDto} from "@/modules/clients/dto/query-clients.dto";
import {ActivityAction, ActivityType, Prisma} from "@/generated/prisma/client";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";
import {TransferBranchDto} from "@/common/dto/transfer-branch.dto";
import {CreateClientDto} from "@/modules/clients/dto/create-client.dto";
import {UpdateClientDto} from "@/modules/clients/dto/update-client.dto";

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryClientsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ClientWhereInput = {
            companyId: user.companyId,
            deletedAt: null,
        };

        // BR-B1 / BR-B3 — see leads.service.ts's findAll for the same pattern.
        if (isBranchScopedRole(user.role)) {
            where.branchId = user.branchId;
        } else if (query.branchId) {
            where.branchId = query.branchId;
        }

        if (query.projectId) {
            where.deals = { some: { projectId: query.projectId } };
        }

        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { phone: { contains: query.search, mode: "insensitive" } },
                { whatsapp: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { passport: { contains: query.search, mode: "insensitive" } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: { select: { leads: true, deals: true } },
                },
            }),
            this.prisma.client.count({ where }),
        ]);

        return {
            items,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const client = await this.prisma.client.findFirst({
            where: {
                id,
                companyId: user.companyId,
                deletedAt: null,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
            include: {
                leads: {
                    orderBy: { createdAt: "desc" },
                    select: { id: true, fullName: true, phone: true, source: true, status: true, createdAt: true },
                },
                deals: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        dealNumber: true,
                        status: true,
                        salePrice: true,
                        unit: {
                            select: {
                                id: true,
                                number: true,
                                type: true,
                                status: true,
                                rooms: true,
                                area: true,
                                price: true,
                                floor: { select: { id: true, number: true } },
                                entrance: { select: { id: true, name: true } },
                                block: { select: { id: true, name: true } },
                                project: { select: { id: true, name: true } },
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        if (!client) {
            throw new NotFoundException("Client not found");
        }

        return client;
    }

    async create(user: AuthUser, dto: CreateClientDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        // Company-wide, not branch-scoped: two branches must not be able to
        // create a duplicate client for the same phone just because they
        // can't see each other's records — that's exactly what BR-D2's
        // cross-branch warning exists to surface instead of silently allow.
        await this.ensurePhoneIsUniqueInsideCompany(dto.phone, user.companyId);

        // BR-B2: stamped from the actor, never trusted from the request body.
        const branchId = isBranchScopedRole(user.role) ? user.branchId : null;

        return this.prisma.client.create({
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                whatsapp: dto.whatsapp,
                email: dto.email,
                passport: dto.passport,
                pin: dto.pin,
                companyId: user.companyId,
                branchId,
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateClientDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        if (dto.phone) {
            await this.ensurePhoneIsUniqueInsideCompany(dto.phone, user.companyId, id);
        }

        return this.prisma.client.update({
            where: { id },
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                whatsapp: dto.whatsapp,
                email: dto.email,
                passport: dto.passport,
                pin: dto.pin,
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const client = await this.prisma.client.findFirst({
            where: {
                id,
                companyId: user.companyId,
                deletedAt: null,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
        });

        if (!client) {
            throw new NotFoundException("Client not found");
        }

        await this.prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return { success: true };
    }

    /**
     * Hands a client off to another branch (BR-D1) — same shape as
     * LeadsService.transferBranch. COMPANY_ADMIN only, so no branch filter on
     * the lookup: an admin may move any client in their company.
     */
    async transferBranch(user: AuthUser, id: string, dto: TransferBranchDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const client = await this.prisma.client.findFirst({ where: { id, companyId, deletedAt: null } });

        if (!client) {
            throw new NotFoundException("Client not found");
        }

        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId, deactivatedAt: null },
        });

        if (!branch) {
            throw new BadRequestException("Branch does not belong to your company or is deactivated");
        }

        const updated = await this.prisma.client.update({
            where: { id },
            data: { branchId: dto.branchId },
        });

        await this.prisma.activity.create({
            data: {
                companyId,
                userId: user.id,
                clientId: id,
                action: ActivityAction.BRANCH_TRANSFERRED,
                type: ActivityType.CLIENT_BRANCH_TRANSFERRED,
                title: "Client moved to another branch",
                metadata: { fromBranchId: client.branchId, toBranchId: dto.branchId },
            },
        });

        return updated;
    }

    private async ensurePhoneIsUniqueInsideCompany(phone: string, companyId: string, exceptClientId?: string) {
        const existingClient = await this.prisma.client.findFirst({
            where: {
                phone,
                companyId,
                deletedAt: null,
                id: exceptClientId ? { not: exceptClientId } : undefined,
            },
        });

        if (existingClient) {
            throw new BadRequestException("Client with this phone already exists");
        }
    }
}
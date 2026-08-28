import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {Prisma} from "@/generated/prisma/client";
import {LeadStatus} from "@/generated/prisma/enums";
import {PrismaService} from "@/database/prisma.service";
import {ClientsService} from "@/modules/clients/clients.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryLeadsDto} from "@/modules/leads/dto/query-leads.dto";
import {CreateLeadDto} from "@/modules/leads/dto/create-lead.dto";
import {UpdateLeadDto} from "@/modules/leads/dto/update-lead.dto";
import {ConvertLeadDto} from "@/modules/leads/dto/convert-lead.dto";

@Injectable()
export class LeadsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly clientsService: ClientsService,
    ) {}

    async findAll(user: AuthUser, query: QueryLeadsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.LeadWhereInput = {
            companyId: user.companyId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.source) {
            where.source = query.source;
        }

        if (query.managerId) {
            where.managerId = query.managerId;
        }

        if (query.search) {
            where.OR = [
                {
                    fullName: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    phone: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    email: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                        },
                    },
                },
            }),
            this.prisma.lead.count({
                where,
            }),
        ]);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const lead = await this.prisma.lead.findFirst({
            where: {
                id,
                companyId: user.companyId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });

        if (!lead) {
            throw new NotFoundException("Lead not found");
        }

        return lead;
    }

    async create(user: AuthUser, dto: CreateLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (dto.managerId) {
            await this.ensureUserBelongsToCompany(dto.managerId, user.companyId);
        }

        if (dto.clientId) {
            await this.ensureClientBelongsToCompany(dto.clientId, user.companyId);
        }

        return this.prisma.lead.create({
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                email: dto.email,
                source: dto.source,
                status: dto.status,
                comment: dto.comment,
                companyId: user.companyId,
                managerId: dto.managerId,
                clientId: dto.clientId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        if (dto.managerId) {
            await this.ensureUserBelongsToCompany(dto.managerId, user.companyId);
        }

        if (dto.clientId) {
            await this.ensureClientBelongsToCompany(dto.clientId, user.companyId);
        }

        return this.prisma.lead.update({
            where: {
                id,
            },
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                email: dto.email,
                source: dto.source,
                status: dto.status,
                comment: dto.comment,
                managerId: dto.managerId,
                clientId: dto.clientId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Converts a lead into a client. Either links the lead to an existing
     * client (`dto.clientId`) or creates a brand-new client from the lead's
     * own contact details, then marks the lead as CONVERTED.
     */
    async convert(user: AuthUser, id: string, dto: ConvertLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const lead = await this.findOne(user, id);

        if (lead.clientId) {
            throw new BadRequestException("Lead is already linked to a client");
        }

        let clientId: string;

        if (dto.clientId) {
            await this.ensureClientBelongsToCompany(dto.clientId, user.companyId);
            clientId = dto.clientId;
        } else {
            const client = await this.clientsService.create(user, {
                fullName: lead.fullName,
                phone: lead.phone,
                email: lead.email ?? undefined,
            });
            clientId = client.id;
        }

        return this.prisma.lead.update({
            where: {
                id,
            },
            data: {
                clientId,
                status: LeadStatus.CONVERTED,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    async checkDuplicates(user: AuthUser, phone: string, excludeLeadId?: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const [leads, clients] = await Promise.all([
            this.prisma.lead.findMany({
                where: {
                    companyId,
                    phone,
                    deletedAt: null,
                    id: excludeLeadId ? { not: excludeLeadId } : undefined,
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            this.prisma.client.findMany({
                where: { companyId, phone, deletedAt: null },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        return { leads, clients };
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        await this.prisma.lead.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    private async ensureUserBelongsToCompany(userId: string, companyId: string) {
        const manager = await this.prisma.user.findFirst({
            where: {
                id: userId,
                companyId,
                isActive: true,
            },
        });

        if (!manager) {
            throw new BadRequestException("Manager does not belong to your company");
        }
    }

    private async ensureClientBelongsToCompany(clientId: string, companyId: string) {
        const client = await this.prisma.client.findFirst({
            where: {
                id: clientId,
                companyId,
            },
        });

        if (!client) {
            throw new BadRequestException("Client does not belong to your company");
        }
    }
}

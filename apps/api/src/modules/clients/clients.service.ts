import { PrismaService } from "@/database/prisma.service";
import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryClientsDto} from "@/modules/clients/dto/query-clients.dto";
import { Prisma } from "@/generated/prisma/client";
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
        };

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
                    whatsapp: {
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
                {
                    passport: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            leads: true,
                            deals: true,
                        },
                    },
                },
            }),
            this.prisma.client.count({
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

        const client = await this.prisma.client.findFirst({
            where: {
                id,
                companyId: user.companyId,
            },
            include: {
                leads: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        source: true,
                        status: true,
                        createdAt: true,
                    },
                },
                deals: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        status: true,
                        amount: true,
                        unit: {
                            select: {
                                id: true,
                                number: true,
                                type: true,
                                status: true,
                                rooms: true,
                                area: true,
                                price: true,
                                floor: {
                                    select: {
                                        id: true,
                                        number: true,
                                    },
                                },
                                entrance: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                block: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
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

        await this.ensurePhoneIsUniqueInsideCompany(dto.phone, user.companyId);

        return this.prisma.client.create({
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                whatsapp: dto.whatsapp,
                email: dto.email,
                passport: dto.passport,
                companyId: user.companyId,
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
            where: {
                id,
            },
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                whatsapp: dto.whatsapp,
                email: dto.email,
                passport: dto.passport,
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
            },
            include: {
                _count: {
                    select: {
                        deals: true,
                        leads: true,
                    },
                },
            },
        });

        if (!client) {
            throw new NotFoundException("Client not found");
        }

        if (client._count.deals > 0) {
            throw new BadRequestException(
                "Client has deals and cannot be deleted",
            );
        }

        await this.prisma.client.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    private async ensurePhoneIsUniqueInsideCompany(
        phone: string,
        companyId: string,
        exceptClientId?: string,
    ) {
        const existingClient = await this.prisma.client.findFirst({
            where: {
                phone,
                companyId,
                id: exceptClientId
                    ? {
                        not: exceptClientId,
                    }
                    : undefined,
            },
        });

        if (existingClient) {
            throw new BadRequestException(
                "Client with this phone already exists",
            );
        }
    }
}
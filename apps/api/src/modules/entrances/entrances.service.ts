import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/database/prisma.service";
import { AuthUser } from "@/common/types/auth-user.type";
import { CreateEntranceDto } from "./dto/create-entrance.dto";
import { UpdateEntranceDto } from "./dto/update-entrance.dto";
import { QueryEntrancesDto } from "./dto/query-entrances.dto";

@Injectable()
export class EntrancesService {
    constructor(private readonly prisma: PrismaService) {}

    async findByBlock(
        user: AuthUser,
        blockId: string,
        query: QueryEntrancesDto,
    ) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureBlockBelongsToCompany(blockId, user.companyId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.EntranceWhereInput = {
            blockId,
            block: {
                project: {
                    companyId: user.companyId,
                },
            },
        };

        if (query.search) {
            where.name = {
                contains: query.search,
                mode: "insensitive",
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.entrance.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    {
                        order: "asc",
                    },
                    {
                        name: "asc",
                    },
                ],
                include: {
                    _count: {
                        select: {
                            floors: true,
                            units: true,
                        },
                    },
                },
            }),
            this.prisma.entrance.count({
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

        const entrance = await this.prisma.entrance.findFirst({
            where: {
                id,
                block: {
                    project: {
                        companyId: user.companyId,
                    },
                },
            },
            include: {
                project: {
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
                floors: {
                    orderBy: [
                        {
                            order: "asc",
                        },
                        {
                            number: "asc",
                        },
                    ],
                    include: {
                        _count: {
                            select: {
                                units: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        floors: true,
                        units: true,
                    },
                },
            },
        });

        if (!entrance) {
            throw new NotFoundException("Entrance not found");
        }

        return entrance;
    }

    async create(user: AuthUser, blockId: string, dto: CreateEntranceDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const block = await this.ensureBlockBelongsToCompany(
            blockId,
            user.companyId,
        );

        await this.ensureEntranceNameIsUniqueInsideBlock(dto.name, blockId);

        return this.prisma.entrance.create({
            data: {
                name: dto.name,
                order: dto.order ?? 0,
                projectId: block.projectId,
                blockId,
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateEntranceDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const entrance = await this.prisma.entrance.findFirst({
            where: {
                id,
                block: {
                    project: {
                        companyId: user.companyId,
                    },
                },
            },
        });

        if (!entrance) {
            throw new NotFoundException("Entrance not found");
        }

        if (dto.name) {
            await this.ensureEntranceNameIsUniqueInsideBlock(
                dto.name,
                entrance.blockId,
                id,
            );
        }

        return this.prisma.entrance.update({
            where: {
                id,
            },
            data: {
                name: dto.name,
                order: dto.order,
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const entrance = await this.prisma.entrance.findFirst({
            where: {
                id,
                block: {
                    project: {
                        companyId: user.companyId,
                    },
                },
            },
            include: {
                _count: {
                    select: {
                        floors: true,
                        units: true,
                    },
                },
            },
        });

        if (!entrance) {
            throw new NotFoundException("Entrance not found");
        }

        if (entrance._count.floors > 0 || entrance._count.units > 0) {
            throw new BadRequestException(
                "Entrance has floors or units and cannot be deleted",
            );
        }

        await this.prisma.entrance.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    private async ensureBlockBelongsToCompany(
        blockId: string,
        companyId: string,
    ) {
        const block = await this.prisma.block.findFirst({
            where: {
                id: blockId,
                project: {
                    companyId,
                },
            },
        });

        if (!block) {
            throw new BadRequestException("Block does not belong to your company");
        }

        return block;
    }

    private async ensureEntranceNameIsUniqueInsideBlock(
        name: string,
        blockId: string,
        exceptEntranceId?: string,
    ) {
        const existingEntrance = await this.prisma.entrance.findFirst({
            where: {
                name,
                blockId,
                id: exceptEntranceId
                    ? {
                        not: exceptEntranceId,
                    }
                    : undefined,
            },
        });

        if (existingEntrance) {
            throw new BadRequestException(
                "Entrance with this name already exists in this block",
            );
        }
    }
}
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/database/prisma.service";
import { AuthUser } from "@/common/types/auth-user.type";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { QueryFloorsDto } from "./dto/query-floors.dto";

@Injectable()
export class FloorsService {
    constructor(private readonly prisma: PrismaService) {}

    async findByEntrance(
        user: AuthUser,
        entranceId: string,
        query: QueryFloorsDto,
    ) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureEntranceBelongsToCompany(entranceId, user.companyId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.FloorWhereInput = {
            entranceId,
            entrance: {
                block: {
                    project: {
                        companyId: user.companyId,
                    },
                },
            },
        };

        if (query.number !== undefined) {
            where.number = query.number;
        }

        const [items, total] = await Promise.all([
            this.prisma.floor.findMany({
                where,
                skip,
                take: limit,
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
            }),
            this.prisma.floor.count({
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

        const floor = await this.prisma.floor.findFirst({
            where: {
                id,
                entrance: {
                    block: {
                        project: {
                            companyId: user.companyId,
                        },
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
                entrance: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                units: {
                    orderBy: {
                        number: "asc",
                    },
                    select: {
                        id: true,
                        number: true,
                        type: true,
                        status: true,
                        rooms: true,
                        square: true,
                        price: true,
                    },
                },
                _count: {
                    select: {
                        units: true,
                    },
                },
            },
        });

        if (!floor) {
            throw new NotFoundException("Floor not found");
        }

        return floor;
    }

    async create(user: AuthUser, entranceId: string, dto: CreateFloorDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const entrance = await this.ensureEntranceBelongsToCompany(
            entranceId,
            user.companyId,
        );

        await this.ensureFloorNumberIsUniqueInsideEntrance(
            dto.number,
            entranceId,
        );

        return this.prisma.floor.create({
            data: {
                number: dto.number,
                order: dto.order ?? dto.number,
                projectId: entrance.projectId,
                blockId: entrance.blockId,
                entranceId,
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateFloorDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const floor = await this.prisma.floor.findFirst({
            where: {
                id,
                entrance: {
                    block: {
                        project: {
                            companyId: user.companyId,
                        },
                    },
                },
            },
        });

        if (!floor) {
            throw new NotFoundException("Floor not found");
        }

        if (dto.number !== undefined) {
            await this.ensureFloorNumberIsUniqueInsideEntrance(
                dto.number,
                floor.entranceId,
                id,
            );
        }

        return this.prisma.floor.update({
            where: {
                id,
            },
            data: {
                number: dto.number,
                order: dto.order,
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const floor = await this.prisma.floor.findFirst({
            where: {
                id,
                entrance: {
                    block: {
                        project: {
                            companyId: user.companyId,
                        },
                    },
                },
            },
            include: {
                _count: {
                    select: {
                        units: true,
                    },
                },
            },
        });

        if (!floor) {
            throw new NotFoundException("Floor not found");
        }

        if (floor._count.units > 0) {
            throw new BadRequestException(
                "Floor has units and cannot be deleted",
            );
        }

        await this.prisma.floor.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    private async ensureEntranceBelongsToCompany(
        entranceId: string,
        companyId: string,
    ) {
        const entrance = await this.prisma.entrance.findFirst({
            where: {
                id: entranceId,
                block: {
                    project: {
                        companyId,
                    },
                },
            },
        });

        if (!entrance) {
            throw new BadRequestException(
                "Entrance does not belong to your company",
            );
        }

        return entrance;
    }

    private async ensureFloorNumberIsUniqueInsideEntrance(
        number: number,
        entranceId: string,
        exceptFloorId?: string,
    ) {
        const existingFloor = await this.prisma.floor.findFirst({
            where: {
                number,
                entranceId,
                id: exceptFloorId
                    ? {
                        not: exceptFloorId,
                    }
                    : undefined,
            },
        });

        if (existingFloor) {
            throw new BadRequestException(
                "Floor with this number already exists in this entrance",
            );
        }
    }
}
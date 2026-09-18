import {BadRequestException, ForbiddenException, Injectable, NotFoundException,} from "@nestjs/common";
import {ActivityAction, ActivityType, Prisma, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateEntranceDto} from "./dto/create-entrance.dto";
import {UpdateEntranceDto} from "./dto/update-entrance.dto";
import {QueryEntrancesDto} from "./dto/query-entrances.dto";

@Injectable()
export class EntrancesService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Records a company-scoped entrance activity. entranceId is left out for
     * an entrance that's already been hard-deleted, since Activity.entranceId
     * is a real FK and the row it would point to no longer exists.
     */
    private logEntranceActivity(params: {
        companyId: string;
        actorId: string;
        entranceId?: string;
        action: ActivityAction;
        type: ActivityType;
        title: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        return this.prisma.activity.create({
            data: {
                companyId: params.companyId,
                userId: params.actorId,
                entranceId: params.entranceId,
                action: params.action,
                type: params.type,
                title: params.title,
                metadata: params.metadata,
            },
        });
    }

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

        const lastEntrance =
            await this.prisma.entrance.findFirst({
                where: {
                    blockId,
                },
                orderBy: {
                    order: "desc",
                },
                select: {
                    order: true,
                },
            });

        const nextOrder =
            dto.order ??
            ((lastEntrance?.order ?? 0) + 1);

        await this.ensureEntranceNameIsUniqueInsideBlock(dto.name, blockId);

        const created = await this.prisma.entrance.create({
            data: {
                name: dto.name,
                order: nextOrder,
                projectId: block.projectId,
                blockId,
            },
        });

        await this.logEntranceActivity({
            companyId: user.companyId,
            actorId: user.id,
            entranceId: created.id,
            action: ActivityAction.CREATED_ENTRANCE,
            type: ActivityType.ENTRANCE_CREATED,
            title: `Entrance "${created.name}" created`,
        });

        return created;
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

        const updated = await this.prisma.entrance.update({
            where: {
                id,
            },
            data: {
                name: dto.name,
                order: dto.order,
            },
        });

        const fieldsChanged =
            (dto.name !== undefined && dto.name !== entrance.name) ||
            (dto.order !== undefined && dto.order !== entrance.order);

        if (fieldsChanged) {
            await this.logEntranceActivity({
                companyId: user.companyId,
                actorId: user.id,
                entranceId: id,
                action: ActivityAction.UPDATED_ENTRANCE,
                type: ActivityType.ENTRANCE_UPDATED,
                title: `Entrance "${updated.name}" updated`,
            });
        }

        return updated;
    }

    async duplicate(user: AuthUser, id: string) {
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
                floors: {
                    include: {
                        units: true,
                    },
                },
            },
        });

        if (!entrance) {
            throw new NotFoundException("Entrance not found");
        }

        // Find unique name
        const existingNames = await this.prisma.entrance.findMany({
            where: { blockId: entrance.blockId },
            select: { name: true },
        });

        let newName = `${entrance.name} (copy)`;
        let counter = 2;
        while (existingNames.some(e => e.name === newName)) {
            newName = `${entrance.name} (copy ${counter})`;
            counter++;
        }

        // Get next order
        const lastEntrance = await this.prisma.entrance.findFirst({
            where: { blockId: entrance.blockId },
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const nextOrder = (lastEntrance?.order ?? 0) + 1;

        // Get global max unit number
        const allUnits = await this.prisma.unit.findMany({
            where: { blockId: entrance.blockId },
            select: { number: true },
        });

        const maxUnitNumber = allUnits.reduce((max, unit) => {
            const num = parseInt(unit.number);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        let unitCounter = maxUnitNumber + 1;

        // Create the new entrance
        const newEntrance = await this.prisma.entrance.create({
            data: {
                name: newName,
                order: nextOrder,
                project: {
                    connect: { id: entrance.projectId },
                },
                block: {
                    connect: { id: entrance.blockId },
                },
            },
        });

        await this.logEntranceActivity({
            companyId: user.companyId,
            actorId: user.id,
            entranceId: newEntrance.id,
            action: ActivityAction.CREATED_ENTRANCE,
            type: ActivityType.ENTRANCE_CREATED,
            title: `Entrance "${newEntrance.name}" created (duplicated from "${entrance.name}")`,
            metadata: {duplicatedFromEntranceId: entrance.id},
        });

        // Create floors and units
        for (const floor of entrance.floors) {
            const newFloor = await this.prisma.floor.create({
                data: {
                    number: floor.number,
                    order: floor.order,
                    project: {
                        connect: { id: entrance.projectId },
                    },
                    block: {
                        connect: { id: entrance.blockId },
                    },
                    entrance: {
                        connect: { id: newEntrance.id },
                    },
                },
            });

            if (floor.units.length > 0) {
                await this.prisma.unit.createMany({
                    data: floor.units.map(unit => ({
                        number: String(unitCounter++),
                        type: unit.type,
                        status: UnitStatus.AVAILABLE,
                        rooms: unit.rooms ?? null,
                        area: unit.area,
                        price: unit.price,
                        projectId: entrance.projectId,
                        blockId: entrance.blockId,
                        entranceId: newEntrance.id,
                        floorId: newFloor.id,
                    })),
                });
            }
        }

        // Return the complete duplicated entrance
        return this.prisma.entrance.findUnique({
            where: { id: newEntrance.id },
            include: {
                floors: {
                    include: {
                        units: true,
                    },
                },
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

        await this.logEntranceActivity({
            companyId: user.companyId,
            actorId: user.id,
            action: ActivityAction.DELETED_ENTRANCE,
            type: ActivityType.ENTRANCE_DELETED,
            title: `Entrance "${entrance.name}" deleted`,
            metadata: {entranceId: entrance.id},
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
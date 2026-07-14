import {BadRequestException, ForbiddenException, Injectable, NotFoundException,} from "@nestjs/common";
import {Prisma, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateFloorDto} from "./dto/create-floor.dto";
import {UpdateFloorDto} from "./dto/update-floor.dto";
import {QueryFloorsDto} from "./dto/query-floors.dto";
import {CreateFloorsBulkDto} from "@/modules/floors/dto/create-floors-bulk.dto";

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
                        area: true,
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

        const lastFloor =
            await this.prisma.floor.findFirst({
                where: {
                    entranceId,
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
            ((lastFloor?.order ?? 0) + 1);

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
                order: nextOrder,
                projectId: entrance.projectId,
                blockId: entrance.blockId,
                entranceId,
            },
        });
    }

    async createBulk(user: AuthUser, entranceId: string, dto: CreateFloorsBulkDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const entrance = await this.ensureEntranceBelongsToCompany(entranceId, user.companyId);

        return await Promise.all(
            dto.floors.map((floor) =>
                this.prisma.floor.create({
                    data: {
                        number: floor.number,
                        order: floor.order ?? floor.number,
                        projectId: entrance.projectId,
                        blockId: entrance.blockId,
                        entranceId,
                    },
                })
            )
        );
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

    async duplicate(user: AuthUser, id: string) {
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
                units: true,
            },
        });

        if (!floor) {
            throw new NotFoundException("Floor not found");
        }

        // Get next order
        const lastFloor = await this.prisma.floor.findFirst({
            where: { entranceId: floor.entranceId },
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const nextOrder = (lastFloor?.order ?? 0) + 1;

        // Find unique number
        const existingNumbers = await this.prisma.floor.findMany({
            where: { entranceId: floor.entranceId },
            select: { number: true },
        });

        let newNumber = floor.number + 1;
        while (existingNumbers.some(f => f.number === newNumber)) {
            newNumber++;
        }

        // Get global max unit number
        const allUnits = await this.prisma.unit.findMany({
            where: { blockId: floor.blockId },
            select: { number: true },
        });

        const maxUnitNumber = allUnits.reduce((max, unit) => {
            const num = parseInt(unit.number);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        let unitCounter = maxUnitNumber + 1;

        // Create the new floor
        const newFloor = await this.prisma.floor.create({
            data: {
                number: newNumber,
                order: nextOrder,
                project: {
                    connect: { id: floor.projectId },
                },
                block: {
                    connect: { id: floor.blockId },
                },
                entrance: {
                    connect: { id: floor.entranceId },
                },
            },
        });

        // Create units using createMany
        if (floor.units.length > 0) {
            await this.prisma.unit.createMany({
                data: floor.units.map(unit => ({
                    number: String(unitCounter++),
                    type: unit.type,
                    status: UnitStatus.AVAILABLE,
                    rooms: unit.rooms ?? null,
                    area: unit.area,
                    price: unit.price,
                    projectId: floor.projectId,
                    blockId: floor.blockId,
                    entranceId: floor.entranceId,
                    floorId: newFloor.id,
                })),
            });
        }

        // Return the complete duplicated floor
        return this.prisma.floor.findUnique({
            where: { id: newFloor.id },
            include: {
                units: true,
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
import {BadRequestException, ForbiddenException, Injectable, NotFoundException,} from "@nestjs/common";
import {Prisma, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateUnitDto} from "./dto/create-unit.dto";
import {UpdateUnitDto} from "./dto/update-unit.dto";
import {QueryUnitsDto} from "./dto/query-units.dto";
import {CreateUnitsBulkDto} from "@/modules/units/dto/create-units-bulk.dto";

@Injectable()
export class UnitsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryUnitsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.UnitWhereInput = {
            project: {
                companyId: user.companyId,
            },
        };

        if (query.projectId) {
            where.projectId = query.projectId;
        }

        if (query.blockId) {
            where.blockId = query.blockId;
        }

        if (query.entranceId) {
            where.entranceId = query.entranceId;
        }

        if (query.floorId) {
            where.floorId = query.floorId;
        }

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.rooms !== undefined) {
            where.rooms = query.rooms;
        }

        if (query.search) {
            where.OR = [
                {
                    number: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    block: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    entrance: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    project: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.unit.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    {
                        block: {
                            order: "asc",
                        },
                    },
                    {
                        entrance: {
                            order: "asc",
                        },
                    },
                    {
                        floor: {
                            order: "asc",
                        },
                    },
                    {
                        number: "asc",
                    },
                ],
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
                    floor: {
                        select: {
                            id: true,
                            number: true,
                        },
                    },
                },
            }),
            this.prisma.unit.count({
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

    async findByFloor(user: AuthUser, floorId: string, query: QueryUnitsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureFloorBelongsToCompany(floorId, user.companyId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.UnitWhereInput = {
            floorId,
            floor: {
                entrance: {
                    block: {
                        project: {
                            companyId: user.companyId,
                        },
                    },
                },
            },
        };

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.rooms !== undefined) {
            where.rooms = query.rooms;
        }

        if (query.search) {
            where.OR = [
                {
                    number: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.unit.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    number: "asc",
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
                    floor: {
                        select: {
                            id: true,
                            number: true,
                        },
                    },
                },
            }),
            this.prisma.unit.count({
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

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
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
                floor: {
                    select: {
                        id: true,
                        number: true,
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
                        bookingUntil: true,
                        client: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        return unit;
    }

    async create(user: AuthUser, floorId: string, dto: CreateUnitDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const floor = await this.ensureFloorBelongsToCompany(
            floorId,
            user.companyId,
        );

        await this.ensureUnitNumberIsUniqueInsideBlock(
            dto.number,
            floor.blockId,
        );

        return this.prisma.unit.create({
            data: {
                number: dto.number,
                type: dto.type,
                status: dto.status ?? UnitStatus.AVAILABLE,
                rooms: dto.rooms,
                area: dto.area,
                price: dto.price,
                projectId: floor.projectId,
                blockId: floor.blockId,
                entranceId: floor.entranceId,
                floorId,
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
                floor: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
            },
        });
    }

    async createBulk(user: AuthUser, floorId: string, dto: CreateUnitsBulkDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const floor = await this.ensureFloorBelongsToCompany(floorId, user.companyId);

        return await Promise.all(
            dto.units.map((unit) =>
                this.prisma.unit.create({
                    data: {
                        number: unit.number,
                        type: unit.type,
                        status: UnitStatus.AVAILABLE,
                        rooms: unit.rooms,
                        area: unit.area,
                        price: unit.price,
                        projectId: floor.projectId,
                        blockId: floor.blockId,
                        entranceId: floor.entranceId,
                        floorId,
                    },
                })
            )
        );
    }

    async update(user: AuthUser, id: string, dto: UpdateUnitDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        if (dto.number) {
            await this.ensureUnitNumberIsUniqueInsideBlock(
                dto.number,
                unit.blockId,
                id,
            );
        }

        return this.prisma.unit.update({
            where: {
                id,
            },
            data: {
                number: dto.number,
                type: dto.type,
                status: dto.status,
                rooms: dto.rooms,
                area: dto.area,
                price: dto.price,
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
                floor: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
            },
        });
    }

    async duplicate(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        // Get global max unit number
        const allUnits = await this.prisma.unit.findMany({
            where: { blockId: unit.blockId },
            select: { number: true },
        });

        const maxUnitNumber = allUnits.reduce((max, u) => {
            const num = parseInt(u.number);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        return this.prisma.unit.create({
            data: {
                number: String(maxUnitNumber + 1),
                type: unit.type,
                status: UnitStatus.AVAILABLE,
                rooms: unit.rooms,
                area: unit.area,
                price: unit.price,
                projectId: unit.projectId,
                blockId: unit.blockId,
                entranceId: unit.entranceId,
                floorId: unit.floorId,
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
            include: {
                _count: {
                    select: {
                        deals: true,
                    },
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        if (unit._count.deals > 0) {
            throw new BadRequestException(
                "Unit has deals and cannot be deleted",
            );
        }

        await this.prisma.unit.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    async updateStatus(user: AuthUser, id: string, status: UnitStatus) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        return this.prisma.unit.update({
            where: {
                id,
            },
            data: {
                status,
            },
        });
    }

    private async ensureFloorBelongsToCompany(
        floorId: string,
        companyId: string,
    ) {
        const floor = await this.prisma.floor.findFirst({
            where: {
                id: floorId,
                entrance: {
                    block: {
                        project: {
                            companyId,
                        },
                    },
                },
            },
        });

        if (!floor) {
            throw new BadRequestException("Floor does not belong to your company");
        }

        return floor;
    }

    private async ensureUnitNumberIsUniqueInsideBlock(
        number: string,
        blockId: string,
        exceptUnitId?: string,
    ) {
        const existingUnit = await this.prisma.unit.findFirst({
            where: {
                number,
                blockId,
                id: exceptUnitId
                    ? {
                        not: exceptUnitId,
                    }
                    : undefined,
            },
        });

        if (existingUnit) {
            throw new BadRequestException(
                "Unit with this number already exists in this block",
            );
        }
    }
}
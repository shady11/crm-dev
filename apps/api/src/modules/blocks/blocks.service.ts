import {BadRequestException, ForbiddenException, Injectable, NotFoundException,} from "@nestjs/common";
import {Prisma, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateBlockDto} from "./dto/create-block.dto";
import {UpdateBlockDto} from "./dto/update-block.dto";
import {QueryBlocksDto} from "./dto/query-blocks.dto";

@Injectable()
export class BlocksService {
    constructor(private readonly prisma: PrismaService) {}

    async findByProject(
        user: AuthUser,
        projectId: string,
        query: QueryBlocksDto,
    ) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureProjectBelongsToCompany(projectId, user.companyId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.BlockWhereInput = {
            projectId,
            project: {
                companyId: user.companyId,
            },
        };

        if (query.search) {
            where.name = {
                contains: query.search,
                mode: "insensitive",
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.block.findMany({
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
                            entrances: true,
                            floors: true,
                            units: true,
                        },
                    },
                },
            }),
            this.prisma.block.count({
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

        const block = await this.prisma.block.findFirst({
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
                entrances: {
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
                },
                _count: {
                    select: {
                        entrances: true,
                        floors: true,
                        units: true,
                    },
                },
            },
        });

        if (!block) {
            throw new NotFoundException("Block not found");
        }

        return block;
    }

    async create(user: AuthUser, projectId: string, dto: CreateBlockDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const lastBlock =
            await this.prisma.block.findFirst({
                where: {
                    projectId,
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
            ((lastBlock?.order ?? 0) + 1);

        await this.ensureProjectBelongsToCompany(projectId, user.companyId);

        await this.ensureBlockNameIsUniqueInsideProject(dto.name, projectId);

        return this.prisma.block.create({
            data: {
                name: dto.name,
                order: nextOrder,
                projectId,
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateBlockDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const block = await this.prisma.block.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
        });

        if (!block) {
            throw new NotFoundException("Block not found");
        }

        if (dto.name) {
            await this.ensureBlockNameIsUniqueInsideProject(
                dto.name,
                block.projectId,
                id,
            );
        }

        return this.prisma.block.update({
            where: {
                id,
            },
            data: {
                name: dto.name,
                order: dto.order,
            },
        });
    }

    async duplicate(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const block = await this.prisma.block.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
            include: {
                entrances: {
                    include: {
                        floors: {
                            include: {
                                units: true,
                            },
                        },
                    },
                },
            },
        });

        if (!block) {
            throw new NotFoundException("Block not found");
        }

        // Find unique name
        const existingNames = await this.prisma.block.findMany({
            where: { projectId: block.projectId },
            select: { name: true },
        });

        let newName = `${block.name} (copy)`;
        let counter = 2;
        while (existingNames.some(b => b.name === newName)) {
            newName = `${block.name} (copy ${counter})`;
            counter++;
        }

        // Get next order
        const lastBlock = await this.prisma.block.findFirst({
            where: { projectId: block.projectId },
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const nextOrder = (lastBlock?.order ?? 0) + 1;

        let unitCounter = 1;

        // First, create the block
        const newBlock = await this.prisma.block.create({
            data: {
                name: newName,
                order: nextOrder,
                project: {
                    connect: { id: block.projectId },
                },
            },
        });

        // Then create entrances one by one (or use transactions)
        for (const entrance of block.entrances) {
            const newEntrance = await this.prisma.entrance.create({
                data: {
                    name: entrance.name,
                    order: entrance.order,
                    project: {
                        connect: { id: block.projectId },
                    },
                    block: {
                        connect: { id: newBlock.id },
                    },
                },
            });

            for (const floor of entrance.floors) {
                const newFloor = await this.prisma.floor.create({
                    data: {
                        number: floor.number,
                        order: floor.order,
                        project: {
                            connect: { id: block.projectId },
                        },
                        block: {
                            connect: { id: newBlock.id },
                        },
                        entrance: {
                            connect: { id: newEntrance.id },
                        },
                    },
                });

                // Create units for this floor
                if (floor.units.length > 0) {
                    await this.prisma.unit.createMany({
                        data: floor.units.map(unit => ({
                            number: String(unitCounter++),
                            type: unit.type,
                            status: UnitStatus.AVAILABLE,
                            rooms: unit.rooms ?? null,
                            area: unit.area,
                            price: unit.price,
                            projectId: block.projectId,
                            blockId: newBlock.id,
                            entranceId: newEntrance.id,
                            floorId: newFloor.id,
                        })),
                    });
                }
            }
        }

        // Return the complete duplicated block
        return this.prisma.block.findUnique({
            where: { id: newBlock.id },
            include: {
                entrances: {
                    include: {
                        floors: {
                            include: {
                                units: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const block = await this.prisma.block.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
            include: {
                _count: {
                    select: {
                        entrances: true,
                        floors: true,
                        units: true,
                    },
                },
            },
        });

        if (!block) {
            throw new NotFoundException("Block not found");
        }

        if (
            block._count.entrances > 0 ||
            block._count.floors > 0 ||
            block._count.units > 0
        ) {
            throw new BadRequestException(
                "Block has entrances, floors or units and cannot be deleted",
            );
        }

        await this.prisma.block.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    private async ensureProjectBelongsToCompany(
        projectId: string,
        companyId: string,
    ) {
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                companyId,
            },
        });

        if (!project) {
            throw new BadRequestException(
                "Project does not belong to your company",
            );
        }
    }

    private async ensureBlockNameIsUniqueInsideProject(
        name: string,
        projectId: string,
        exceptBlockId?: string,
    ) {
        const existingBlock = await this.prisma.block.findFirst({
            where: {
                name,
                projectId,
                id: exceptBlockId
                    ? {
                        not: exceptBlockId,
                    }
                    : undefined,
            },
        });

        if (existingBlock) {
            throw new BadRequestException(
                "Block with this name already exists in this project",
            );
        }
    }
}
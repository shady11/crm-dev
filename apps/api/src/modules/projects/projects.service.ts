import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryProjectsDto} from "@/modules/projects/dto/query-projects.dto";
import {Prisma, ProjectStatus} from "@/generated/prisma/client";
import {CreateProjectDto} from "@/modules/projects/dto/create-project.dto";
import {UpdateProjectDto} from "@/modules/projects/dto/update-project.dto";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryProjectsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ProjectWhereInput = {
            companyId: user.companyId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            where.OR = [
                {
                    name: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    address: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            blocks: true,
                            units: true,
                        },
                    },
                },
            }),
            this.prisma.project.count({
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

        const project = await this.prisma.project.findFirst({
            where: {
                id,
                companyId: user.companyId,
            },
            include: {
                blocks: {
                    orderBy: {
                        name: "asc",
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
                },
                _count: {
                    select: {
                        blocks: true,
                        units: true,
                    },
                },
            },
        });

        if (!project) {
            throw new NotFoundException("Project not found");
        }

        return project;
    }

    async create(user: AuthUser, dto: CreateProjectDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureProjectNameIsUniqueInsideCompany(dto.name, user.companyId);

        return this.prisma.project.create({
            data: {
                name: dto.name,
                address: dto.address,
                status: dto.status ?? ProjectStatus.DRAFT,
                companyId: user.companyId,
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateProjectDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        if (dto.name) {
            await this.ensureProjectNameIsUniqueInsideCompany(
                dto.name,
                user.companyId,
                id,
            );
        }

        return this.prisma.project.update({
            where: {
                id,
            },
            data: {
                name: dto.name,
                address: dto.address,
                status: dto.status,
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id,
                companyId: user.companyId,
            },
            include: {
                _count: {
                    select: {
                        blocks: true,
                        units: true,
                    },
                },
            },
        });

        if (!project) {
            throw new NotFoundException("Project not found");
        }

        if (project._count.blocks > 0 || project._count.units > 0) {
            throw new BadRequestException(
                "Project has blocks or units and cannot be deleted",
            );
        }

        await this.prisma.project.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    async getTree(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id,
                companyId: user.companyId,
            },
            include: {
                blocks: {
                    orderBy: [
                        { order: "asc" },
                        { name: "asc" },
                    ],
                    select: {
                        id: true,
                        name: true,
                        order: true,
                        entrances: {
                            orderBy: [
                                { order: "asc" },
                                { name: "asc" },
                            ],
                            select: {
                                id: true,
                                name: true,
                                order: true,
                                floors: {
                                    orderBy: [
                                        { order: "desc" },
                                        { number: "desc" },
                                    ],
                                    select: {
                                        id: true,
                                        number: true,
                                        order: true,
                                        units: {
                                            orderBy: {
                                                number: "asc",
                                            },
                                            include: {
                                                deals: {
                                                    where: {
                                                        status: { in: ACTIVE_DEAL_STATUSES },
                                                    },
                                                    orderBy: {
                                                        createdAt: "desc",
                                                    },
                                                    take: 1,
                                                    select: {
                                                        id: true,
                                                        dealNumber: true,
                                                        status: true,
                                                        reservedAt: true,
                                                        reservationExpiresAt: true,
                                                        salePrice: true,
                                                        deposit: true,
                                                        client: {
                                                            select: {
                                                                id: true,
                                                                fullName: true,
                                                                phone: true,
                                                            },
                                                        },
                                                        manager: {
                                                            select: {
                                                                id: true,
                                                                fullName: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            throw new NotFoundException("Project not found");
        }

        return project;
    }

    private async ensureProjectNameIsUniqueInsideCompany(
        name: string,
        companyId: string,
        exceptProjectId?: string,
    ) {
        const existingProject = await this.prisma.project.findFirst({
            where: {
                name,
                companyId,
                id: exceptProjectId
                    ? {
                        not: exceptProjectId,
                    }
                    : undefined,
            },
        });

        if (existingProject) {
            throw new BadRequestException(
                "Project with this name already exists",
            );
        }
    }
}
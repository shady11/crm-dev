import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryProjectsDto} from "@/modules/projects/dto/query-projects.dto";
import {ActivityAction, ActivityType, Prisma, ProjectStatus} from "@/generated/prisma/client";
import {CreateProjectDto} from "@/modules/projects/dto/create-project.dto";
import {UpdateProjectDto} from "@/modules/projects/dto/update-project.dto";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Records a company-scoped project activity — same pattern as
     * logUserActivity/logUnitActivity. projectId is left out for a project
     * that's already been hard-deleted, since Activity.projectId is a real
     * FK and the row it would point to no longer exists.
     */
    private logProjectActivity(params: {
        companyId: string;
        actorId: string;
        projectId?: string;
        action: ActivityAction;
        type: ActivityType;
        title: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        return this.prisma.activity.create({
            data: {
                companyId: params.companyId,
                userId: params.actorId,
                projectId: params.projectId,
                action: params.action,
                type: params.type,
                title: params.title,
                metadata: params.metadata,
            },
        });
    }

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

        const created = await this.prisma.project.create({
            data: {
                name: dto.name,
                address: dto.address,
                status: dto.status ?? ProjectStatus.DRAFT,
                companyId: user.companyId,
            },
        });

        await this.logProjectActivity({
            companyId: user.companyId,
            actorId: user.id,
            projectId: created.id,
            action: ActivityAction.CREATED_PROJECT,
            type: ActivityType.PROJECT_CREATED,
            title: `Project "${created.name}" created`,
        });

        return created;
    }

    async update(user: AuthUser, id: string, dto: UpdateProjectDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const existing = await this.findOne(user, id);

        if (dto.name) {
            await this.ensureProjectNameIsUniqueInsideCompany(
                dto.name,
                user.companyId,
                id,
            );
        }

        const statusChanged = dto.status !== undefined && dto.status !== existing.status;
        const fieldsChanged =
            (dto.name !== undefined && dto.name !== existing.name) ||
            (dto.address !== undefined && dto.address !== existing.address);

        const updated = await this.prisma.project.update({
            where: {
                id,
            },
            data: {
                name: dto.name,
                address: dto.address,
                status: dto.status,
            },
        });

        if (statusChanged) {
            await this.logProjectActivity({
                companyId: user.companyId,
                actorId: user.id,
                projectId: id,
                action: ActivityAction.CHANGED_PROJECT_STATUS,
                type: ActivityType.PROJECT_STATUS_CHANGED,
                title: `Project "${updated.name}" status changed`,
                metadata: {fromStatus: existing.status, toStatus: updated.status},
            });
        }

        if (fieldsChanged) {
            await this.logProjectActivity({
                companyId: user.companyId,
                actorId: user.id,
                projectId: id,
                action: ActivityAction.UPDATED_PROJECT,
                type: ActivityType.PROJECT_UPDATED,
                title: `Project "${updated.name}" updated`,
            });
        }

        return updated;
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

        // No projectId — the row is already gone, and Activity.projectId is a
        // real FK, so the identifying details go in metadata instead.
        await this.logProjectActivity({
            companyId: user.companyId,
            actorId: user.id,
            action: ActivityAction.DELETED_PROJECT,
            type: ActivityType.PROJECT_DELETED,
            title: `Project "${project.name}" deleted`,
            metadata: {projectId: project.id},
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
                                            where: {
                                                deletedAt: null,
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
import {BadRequestException, ForbiddenException, Injectable} from "@nestjs/common";
import {NotificationEntityType, NotificationType, Prisma, TaskStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto} from "./dto/query-tasks.dto";
import {TaskNotFoundException} from "./exceptions/task-not-found.exception";
import {NotificationsService} from "@/modules/notifications/notifications.service";

const TASK_INCLUDE = {
    assignedTo: { select: { id: true, fullName: true } },
    lead: { select: { id: true, fullName: true } },
    client: { select: { id: true, fullName: true } },
    deal: { select: { id: true, dealNumber: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async findAll(user: AuthUser, query: QueryTasksDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.TaskWhereInput = {
            companyId: user.companyId,
            deletedAt: null,
            status: query.status,
            assignedToId: query.assignedToId,
            dealId: query.dealId,
            clientId: query.clientId,
            leadId: query.leadId,
        };

        if (query.search) {
            where.title = { contains: query.search, mode: "insensitive" };
        }

        if (query.overdue) {
            where.dueDate = { lt: new Date() };
            where.status = { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] };
        }

        const [items, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
                include: TASK_INCLUDE,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            items,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const task = await this.prisma.task.findFirst({
            where: { id, companyId: user.companyId, deletedAt: null },
            include: TASK_INCLUDE,
        });

        if (!task) throw new TaskNotFoundException(id);

        return task;
    }

    async create(user: AuthUser, dto: CreateTaskDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        this.ensureSingleEntityLink(dto);
        await this.ensureAssigneeInCompany(dto.assignedToId, user.companyId);

        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                status: dto.status ?? TaskStatus.TODO,
                assignedToId: dto.assignedToId,
                leadId: dto.leadId,
                clientId: dto.clientId,
                dealId: dto.dealId,
                companyId: user.companyId,
            },
            include: TASK_INCLUDE,
        });

        if (task.assignedToId !== user.id) {
            await this.notifications.create({
                companyId: user.companyId!,
                userId: task.assignedToId,
                type: NotificationType.TASK_ASSIGNED,
                title: "New task assigned to you",
                message: task.title,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
            });
        }

        return task;
    }

    async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);
        this.ensureSingleEntityLink(dto);

        if (dto.assignedToId) {
            await this.ensureAssigneeInCompany(dto.assignedToId, user.companyId);
        }

        const task = await this.prisma.task.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
                status: dto.status,
                assignedToId: dto.assignedToId,
                leadId: dto.leadId,
                clientId: dto.clientId,
                dealId: dto.dealId,
            },
            include: TASK_INCLUDE,
        });

        if (task.assignedToId !== user.id) {
            await this.notifications.create({
                companyId: user.companyId!,
                userId: task.assignedToId,
                type: NotificationType.TASK_ASSIGNED,
                title: "New task assigned to you",
                message: task.title,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
            });
        }

        return task;
    }

    async updateStatus(user: AuthUser, id: string, dto: UpdateTaskStatusDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        return this.prisma.task.update({
            where: { id },
            data: { status: dto.status },
            include: TASK_INCLUDE,
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        await this.prisma.task.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return { success: true };
    }

    async getStatusSummary(user: AuthUser) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const counts = await this.prisma.task.groupBy({
            by: ["status"],
            where: { companyId: user.companyId, deletedAt: null },
            _count: { _all: true },
        });

        return Object.values(TaskStatus).map((status) => ({
            status,
            count: counts.find((c) => c.status === status)?._count._all ?? 0,
        }));
    }

    private ensureSingleEntityLink(dto: Pick<CreateTaskDto, "leadId" | "clientId" | "dealId">) {
        const linked = [dto.leadId, dto.clientId, dto.dealId].filter(Boolean);
        if (linked.length > 1) {
            throw new BadRequestException("A task can only be linked to one of lead, client, or deal.");
        }
    }

    private async ensureAssigneeInCompany(assignedToId: string, companyId: string) {
        const exists = await this.prisma.user.findFirst({ where: { id: assignedToId, companyId } });
        if (!exists) {
            throw new BadRequestException("Assignee must belong to your company.");
        }
    }
}
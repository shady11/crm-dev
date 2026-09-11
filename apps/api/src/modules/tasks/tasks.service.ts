import {BadRequestException, ForbiddenException, Injectable} from "@nestjs/common";
import {NotificationEntityType, NotificationType, Prisma, TaskStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto, TASK_SORTABLE_FIELDS} from "./dto/query-tasks.dto";
import {resolveOrderBy} from "@/common/utils/sort.util";
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

        // BR-B1 / BR-B3 — see leads.service.ts's findAll for the same pattern.
        if (isBranchScopedRole(user.role)) {
            where.branchId = user.branchId;
        } else if (query.branchId) {
            where.branchId = query.branchId;
        }

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
                orderBy: resolveOrderBy<Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[]>(
                    query.sortBy,
                    query.sortOrder,
                    TASK_SORTABLE_FIELDS,
                    [{ dueDate: "asc" }, { createdAt: "desc" }],
                ),
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
            where: {
                id,
                companyId: user.companyId,
                deletedAt: null,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
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
        const assignee = await this.ensureAssigneeAssignable(dto.assignedToId, user);

        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                status: dto.status ?? TaskStatus.TODO,
                assignedToId: dto.assignedToId,
                // Derived from the assignee's branch, not stamped from the
                // creating user — a COMPANY_ADMIN assigning a task to a
                // branch's sales manager should produce a task that branch
                // can see.
                branchId: assignee.branchId,
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

        let branchId: string | null | undefined;

        if (dto.assignedToId) {
            const assignee = await this.ensureAssigneeAssignable(dto.assignedToId, user);
            // Reassigning to someone in a different branch moves the task
            // with them — there's no dedicated task-handoff story like leads/
            // clients have, so this keeps branchId consistent on every write.
            branchId = assignee.branchId;
        }

        const task = await this.prisma.task.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
                status: dto.status,
                assignedToId: dto.assignedToId,
                branchId,
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

    async getStatusSummary(user: AuthUser, branchId?: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const where: Prisma.TaskWhereInput = { companyId: user.companyId, deletedAt: null };

        if (isBranchScopedRole(user.role)) {
            where.branchId = user.branchId;
        } else if (branchId) {
            where.branchId = branchId;
        }

        const counts = await this.prisma.task.groupBy({
            by: ["status"],
            where,
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

    /**
     * A branch-scoped actor may only assign a task within their own branch —
     * same reasoning as LeadsService.ensureManagerAssignable.
     */
    private async ensureAssigneeAssignable(assignedToId: string, user: AuthUser) {
        const assignee = await this.prisma.user.findFirst({
            where: {
                id: assignedToId,
                companyId: user.companyId,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
        });

        if (!assignee) {
            throw new BadRequestException("Assignee must belong to your company.");
        }

        return assignee;
    }
}
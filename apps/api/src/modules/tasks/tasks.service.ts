import {BadRequestException, ForbiddenException, Injectable} from "@nestjs/common";
import {
    ActivityAction,
    ActivityType,
    NotificationEntityType,
    NotificationType,
    Prisma,
    TaskPriority,
    TaskStatus,
    TaskType,
} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto, TASK_SORTABLE_FIELDS} from "./dto/query-tasks.dto";
import {resolveOrderBy} from "@/common/utils/sort.util";
import {TaskNotFoundException} from "./exceptions/task-not-found.exception";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {diffChangedFields} from "@/common/utils/activity-diff.util";

const TERMINAL_STATUSES: TaskStatus[] = [TaskStatus.DONE, TaskStatus.CANCELLED];

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

    /** Records a company-scoped task activity — same pattern as the other *Activity helpers. */
    private logTaskActivity(params: {
        companyId: string;
        actorId: string;
        taskId: string;
        action: ActivityAction;
        type: ActivityType;
        title: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        return this.prisma.activity.create({
            data: {
                companyId: params.companyId,
                userId: params.actorId,
                taskId: params.taskId,
                action: params.action,
                type: params.type,
                title: params.title,
                metadata: params.metadata,
            },
        });
    }

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
            priority: query.priority,
            type: query.type,
            assignedToId: query.assignedToId,
            dealId: query.dealId,
            clientId: query.clientId,
            leadId: query.leadId,
        };

        // BR-B1 / BR-B3 — see leads.service.ts's findAll for the same pattern.
        if (user.isBranchScoped) {
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
                ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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
                priority: dto.priority ?? TaskPriority.MEDIUM,
                type: dto.type ?? TaskType.OTHER,
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

        await this.logTaskActivity({
            companyId: user.companyId,
            actorId: user.id,
            taskId: task.id,
            action: ActivityAction.CREATED_TASK,
            type: ActivityType.TASK_CREATED,
            title: `Task "${task.title}" created`,
        });

        return task;
    }

    async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const existing = await this.findOne(user, id);
        this.ensureSingleEntityLink(dto);
        if (dto.status !== undefined) {
            this.ensureOutcomeOnClose(dto.status, existing.status, dto.outcome ?? existing.outcome);
        }

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
                priority: dto.priority,
                type: dto.type,
                outcome: dto.outcome,
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

        const reassigned = dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId;
        const statusChanged = dto.status !== undefined && dto.status !== existing.status;
        const changes = diffChangedFields(dto, existing, [
            "title", "description",
            {field: "dueDate", normalize: (v) => (v ? new Date(v as string | Date).toISOString() : null)},
        ]);

        if (reassigned) {
            await this.logTaskActivity({
                companyId: user.companyId,
                actorId: user.id,
                taskId: id,
                action: ActivityAction.REASSIGNED,
                type: ActivityType.TASK_REASSIGNED,
                title: `Task "${task.title}" reassigned`,
                metadata: {fromAssignedToId: existing.assignedToId, toAssignedToId: task.assignedToId},
            });
        }

        if (statusChanged) {
            await this.logTaskActivity({
                companyId: user.companyId,
                actorId: user.id,
                taskId: id,
                action: task.status === TaskStatus.DONE ? ActivityAction.COMPLETED_TASK : ActivityAction.CHANGED_TASK_STATUS,
                type: task.status === TaskStatus.DONE ? ActivityType.TASK_COMPLETED : ActivityType.TASK_STATUS_CHANGED,
                title: task.status === TaskStatus.DONE ? `Task "${task.title}" completed` : `Task "${task.title}" status changed`,
                metadata: {fromStatus: existing.status, toStatus: task.status},
            });
        }

        if (changes) {
            await this.logTaskActivity({
                companyId: user.companyId,
                actorId: user.id,
                taskId: id,
                action: ActivityAction.UPDATED_TASK,
                type: ActivityType.TASK_UPDATED,
                title: `Task "${task.title}" updated`,
                metadata: changes,
            });
        }

        return task;
    }

    async updateStatus(user: AuthUser, id: string, dto: UpdateTaskStatusDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const existing = await this.findOne(user, id);
        this.ensureOutcomeOnClose(dto.status, existing.status, dto.outcome ?? existing.outcome);

        const task = await this.prisma.task.update({
            where: { id },
            data: { status: dto.status, outcome: dto.outcome ?? existing.outcome },
            include: TASK_INCLUDE,
        });

        if (task.status !== existing.status) {
            await this.logTaskActivity({
                companyId: user.companyId,
                actorId: user.id,
                taskId: id,
                action: task.status === TaskStatus.DONE ? ActivityAction.COMPLETED_TASK : ActivityAction.CHANGED_TASK_STATUS,
                type: task.status === TaskStatus.DONE ? ActivityType.TASK_COMPLETED : ActivityType.TASK_STATUS_CHANGED,
                title: task.status === TaskStatus.DONE ? `Task "${task.title}" completed` : `Task "${task.title}" status changed`,
                metadata: {fromStatus: existing.status, toStatus: task.status},
            });
        }

        return task;
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const existing = await this.findOne(user, id);

        await this.prisma.task.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        await this.logTaskActivity({
            companyId: user.companyId,
            actorId: user.id,
            taskId: id,
            action: ActivityAction.DELETED_TASK,
            type: ActivityType.TASK_DELETED,
            title: `Task "${existing.title}" deleted`,
        });

        return { success: true };
    }

    async getStatusSummary(user: AuthUser, branchId?: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const where: Prisma.TaskWhereInput = { companyId: user.companyId, deletedAt: null };

        if (user.isBranchScoped) {
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
     * A task closed as DONE or CANCELLED must carry an outcome — the whole
     * point of closing it is to leave a signal ("no answer" vs "qualified")
     * for reporting and follow-up automation. Only enforced on the
     * transition *into* a closed state, so re-saving an already-closed task
     * without touching status never re-demands it.
     */
    private ensureOutcomeOnClose(newStatus: TaskStatus, previousStatus: TaskStatus, outcome?: string | null) {
        const closing = TERMINAL_STATUSES.includes(newStatus);
        const wasAlreadyClosed = TERMINAL_STATUSES.includes(previousStatus);

        if (closing && !wasAlreadyClosed && !outcome?.trim()) {
            throw new BadRequestException("An outcome is required to close a task.");
        }
    }

    /**
     * System-triggered task creation — called by other modules (Leads,
     * Deals) as a best-effort side effect of their own events, the same way
     * DealsService.generateAndLogDocument runs document generation outside
     * the triggering transaction. Bypasses the branch-assignment permission
     * check in ensureAssigneeAssignable: the caller already resolved and
     * authorized assignedToId (e.g. a lead's own manager), so re-checking it
     * against the *triggering* user's branch would wrongly reject a
     * company-wide admin's lead being auto-assigned a task in its own
     * branch. Returns null (never throws) when the assignee no longer
     * exists, so a caller's try/catch isn't required for that case — but
     * callers should still wrap this in try/catch, since it can still throw
     * on an unexpected DB error and must never block the event that
     * triggered it.
     */
    async createAutomated(params: {
        companyId: string;
        assignedToId: string;
        actorId: string;
        title: string;
        description?: string;
        type: TaskType;
        priority?: TaskPriority;
        dueDate: Date;
        leadId?: string;
        clientId?: string;
        dealId?: string;
    }) {
        const assignee = await this.prisma.user.findFirst({
            where: { id: params.assignedToId, companyId: params.companyId, isActive: true },
            select: { branchId: true },
        });

        if (!assignee) return null;

        const task = await this.prisma.task.create({
            data: {
                title: params.title,
                description: params.description,
                dueDate: params.dueDate,
                priority: params.priority ?? TaskPriority.MEDIUM,
                type: params.type,
                assignedToId: params.assignedToId,
                branchId: assignee.branchId,
                leadId: params.leadId,
                clientId: params.clientId,
                dealId: params.dealId,
                companyId: params.companyId,
            },
            include: TASK_INCLUDE,
        });

        if (task.assignedToId !== params.actorId) {
            await this.notifications.create({
                companyId: params.companyId,
                userId: task.assignedToId,
                type: NotificationType.TASK_ASSIGNED,
                title: "New task assigned to you",
                message: task.title,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
            });
        }

        await this.logTaskActivity({
            companyId: params.companyId,
            actorId: params.actorId,
            taskId: task.id,
            action: ActivityAction.CREATED_TASK,
            type: ActivityType.TASK_CREATED,
            title: `Task "${task.title}" auto-created`,
        });

        return task;
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
                ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
            },
        });

        if (!assignee) {
            throw new BadRequestException("Assignee must belong to your company.");
        }

        return assignee;
    }
}
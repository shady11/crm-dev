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
import type {DbClient} from "@/database/prisma.types";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto, TASK_SORTABLE_FIELDS} from "./dto/query-tasks.dto";
import {resolveOrderBy} from "@/common/utils/sort.util";
import {TaskNotFoundException} from "./exceptions/task-not-found.exception";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {diffChangedFields} from "@/common/utils/activity-diff.util";
import {hasPermission} from "@/common/utils/permissions.util";
import {activityText} from "@/modules/activities/activity-templates";

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
        templateKey?: string;
        templateParams?: Prisma.InputJsonValue;
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
                templateKey: params.templateKey,
                templateParams: params.templateParams,
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

        // tasks.create_own (a Sales Manager) writes reminders for themselves
        // only; handing work to someone else needs tasks.create.
        const ownOnly = !hasPermission(user, "tasks.create") && hasPermission(user, "tasks.create_own");
        const assignedToId = dto.assignedToId ?? user.id;
        if (ownOnly && assignedToId !== user.id) {
            throw new ForbiddenException("You can only create tasks assigned to yourself.");
        }
        const assignee = await this.ensureAssigneeAssignable(assignedToId, user);

        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                status: dto.status ?? TaskStatus.TODO,
                priority: dto.priority ?? TaskPriority.MEDIUM,
                type: dto.type ?? TaskType.OTHER,
                assignedToId,
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
                templateKey: "taskAssigned",
                params: {taskTitle: task.title},
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
            ...activityText('taskCreated', { task: task.title }),
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

        // Only when it changes: editing the title of a task still held by
        // someone since deactivated shouldn't fail on the unchanged assignee.
        if (dto.assignedToId && dto.assignedToId !== existing.assignedToId) {
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
                templateKey: "taskAssigned",
                params: {taskTitle: task.title},
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
                ...activityText('taskReassigned', { task: task.title }),
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
                ...activityText(task.status === TaskStatus.DONE ? 'taskCompleted' : 'taskStatusChanged', { task: task.title }),
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
                ...activityText('taskUpdated', { task: task.title }),
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
        this.ensureCanChangeStatus(user, existing.assignedToId);
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
                ...activityText(task.status === TaskStatus.DONE ? 'taskCompleted' : 'taskStatusChanged', { task: task.title }),
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
            ...activityText('taskDeleted', { task: existing.title }),
        });

        return { success: true };
    }

    /**
     * Reverses remove() — backs the "Undo" on the delete toast. Same scoping
     * as findOne(), except it looks only at soft-deleted rows.
     */
    async restore(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const existing = await this.prisma.task.findFirst({
            where: {
                id,
                companyId: user.companyId,
                deletedAt: { not: null },
                ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
            },
        });

        if (!existing) throw new TaskNotFoundException(id);

        const task = await this.prisma.task.update({
            where: { id },
            data: { deletedAt: null },
            include: TASK_INCLUDE,
        });

        await this.logTaskActivity({
            companyId: user.companyId,
            actorId: user.id,
            taskId: id,
            action: ActivityAction.RESTORED_TASK,
            type: ActivityType.TASK_RESTORED,
            ...activityText('taskRestored', { task: task.title }),
        });

        return task;
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
     * tasks.edit moves any task the caller can see; tasks.change_status alone
     * (an individual contributor) only moves tasks assigned to them.
     */
    private ensureCanChangeStatus(user: AuthUser, assignedToId: string) {
        if (user.isSuperAdmin || user.permissions?.includes("tasks.edit")) return;

        if (assignedToId !== user.id) {
            throw new ForbiddenException("You can only change the status of tasks assigned to you.");
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
     * When a Sales Head moves a lead or deal to another manager, the work
     * attached to it goes too: every open task on that lead or deal still
     * assigned to the previous manager (the auto-created "Call …" and
     * "Confirm documents …" ones included) is handed to the new one. Tasks
     * the previous manager doesn't hold — say, one the Sales Head assigned
     * to themselves — stay where they are. Runs inside the caller's
     * transaction; the caller sends the single "reassigned to you"
     * notification, so there's no per-task TASK_ASSIGNED here.
     */
    async handOverOpenTasks(db: DbClient, params: {
        companyId: string;
        actorId: string;
        // `standalone`: the person's open tasks tied to no lead or deal, for
        // a manager's handover (SH-5); the linked ones move with their
        // lead or deal.
        link: {leadId: string} | {dealId: string} | {standalone: true};
        fromUserId: string | null;
        toUserId: string;
    }): Promise<{id: string; title: string}[]> {
        if (!params.fromUserId || params.fromUserId === params.toUserId) return [];

        const linkWhere = "standalone" in params.link ? {leadId: null, dealId: null} : params.link;
        const tasks = await db.task.findMany({
            where: {
                companyId: params.companyId,
                ...linkWhere,
                assignedToId: params.fromUserId,
                deletedAt: null,
                status: {in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]},
            },
            select: {id: true, title: true},
        });
        if (tasks.length === 0) return [];

        const assignee = await db.user.findUniqueOrThrow({where: {id: params.toUserId}, select: {branchId: true}});

        await db.task.updateMany({
            where: {id: {in: tasks.map((t) => t.id)}},
            data: {assignedToId: params.toUserId, branchId: assignee.branchId},
        });

        await db.activity.createMany({
            data: tasks.map((task) => ({
                companyId: params.companyId,
                userId: params.actorId,
                taskId: task.id,
                action: ActivityAction.REASSIGNED,
                type: ActivityType.TASK_REASSIGNED,
                ...activityText('taskReassigned', { task: task.title }),
                metadata: {fromAssignedToId: params.fromUserId, toAssignedToId: params.toUserId, ...linkWhere},
            })),
        });

        return tasks;
    }

    /**
     * When a deal is cancelled or its reservation lapses, the work attached
     * to it is moot: its open tasks ("Confirm documents …" and any the team
     * added) are cancelled rather than left to turn overdue on the team's
     * dashboards (SH-3). Runs inside the caller's transaction. Each one is
     * logged on the task; actorId is null only when nobody can be named
     * (an expiry with no manager), in which case nothing is logged.
     */
    async cancelOpenTasksForDeal(db: DbClient, params: {
        companyId: string;
        dealId: string;
        actorId: string | null;
    }): Promise<number> {
        const tasks = await db.task.findMany({
            where: {
                companyId: params.companyId,
                dealId: params.dealId,
                deletedAt: null,
                status: {in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]},
            },
            select: {id: true, title: true, status: true},
        });
        if (tasks.length === 0) return 0;

        await db.task.updateMany({
            where: {id: {in: tasks.map((t) => t.id)}},
            data: {status: TaskStatus.CANCELLED},
        });

        if (params.actorId) {
            const actorId = params.actorId;
            await db.activity.createMany({
                data: tasks.map((task) => ({
                    companyId: params.companyId,
                    userId: actorId,
                    taskId: task.id,
                    dealId: params.dealId,
                    action: ActivityAction.CHANGED_TASK_STATUS,
                    type: ActivityType.TASK_STATUS_CHANGED,
                    ...activityText('taskCancelledWithDeal', { task: task.title }),
                    metadata: {fromStatus: task.status, toStatus: TaskStatus.CANCELLED, dealId: params.dealId},
                })),
            });
        }

        return tasks.length;
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
                templateKey: "taskAssigned",
                params: {taskTitle: task.title},
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
            ...activityText('taskAutoCreated', { task: task.title }),
        });

        return task;
    }

    /**
     * A branch-scoped actor may only assign a task within their own branch —
     * same reasoning as LeadsService.ensureManagerAssignable.
     */
    /**
     * Who the caller may put a task in the name of: active people in their
     * company, or only in their own branch for a branch-scoped role. One
     * definition for both the check below and findAssignees, so the pickers
     * never offer someone the server would refuse.
     */
    private assignableUsersWhere(user: AuthUser): Prisma.UserWhereInput {
        return {
            companyId: user.companyId,
            deletedAt: null,
            isActive: true,
            isSuperAdmin: false,
            ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        };
    }

    /**
     * The task assignee picker and the tasks list's "assigned to" filter.
     * Readable with tasks.view alone, unlike GET /users (users.view), which
     * a Sales Manager or Finance doesn't have.
     */
    async findAssignees(user: AuthUser) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        return this.prisma.user.findMany({
            where: this.assignableUsersWhere(user),
            orderBy: { fullName: "asc" },
            select: { id: true, fullName: true, branchId: true },
        });
    }

    private async ensureAssigneeAssignable(assignedToId: string, user: AuthUser) {
        const assignee = await this.prisma.user.findFirst({
            where: { id: assignedToId, ...this.assignableUsersWhere(user) },
        });

        if (!assignee) {
            throw new BadRequestException(
                user.isBranchScoped
                    ? "Assignee must be an active member of your branch."
                    : "Assignee must be an active member of your company.",
            );
        }

        return assignee;
    }
}
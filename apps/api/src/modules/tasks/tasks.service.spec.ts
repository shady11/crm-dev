import {BadRequestException, ForbiddenException} from '@nestjs/common';
import {TaskPriority, TaskStatus, TaskType} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {TasksService} from './tasks.service';
import {TaskNotFoundException} from './exceptions/task-not-found.exception';

/**
 * TasksService covers BR-B1 branch scoping (this time derived from the
 * assignee rather than stamped from the actor), the single-entity-link rule
 * (a task may link to at most one of lead/client/deal), and the
 * self-assignment notification suppression that keeps someone from getting
 * pinged about a task they just assigned to themselves.
 */
describe('TasksService', () => {
    const branchUser: AuthUser = {
        id: 'user-1',
        email: 'manager@crm.dev',
        name: 'Manager',
        roleId: 'role-sales-manager',
        roleName: 'Sales Manager',
        isBranchScoped: true,
        companyId: 'company-1',
        company: null,
        branchId: 'branch-1',
        branch: null,
    };

    const adminUser: AuthUser = {
        ...branchUser,
        id: 'admin-1',
        roleId: 'role-company-admin',
        roleName: 'Company Admin',
        isBranchScoped: false,
        branchId: null,
    };

    function build(opts: {task?: unknown; assignee?: unknown} = {}) {
        const prisma = {
            task: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockResolvedValue(opts.task ?? null),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'task-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'task-1', ...data})),
                groupBy: jest.fn().mockResolvedValue([]),
            },
            user: {
                findFirst: jest.fn().mockResolvedValue(opts.assignee ?? null),
            },
            activity: {
                create: jest.fn().mockResolvedValue({id: 'activity-1'}),
            },
        };
        const notifications = {create: jest.fn().mockResolvedValue({})};

        const service = new TasksService(prisma as any, notifications as any);
        return {service, prisma, notifications};
    }

    const createDto = (overrides: Record<string, unknown> = {}) => ({
        title: 'Follow up',
        assignedToId: 'assignee-1',
        ...overrides,
    }) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...branchUser, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes branch-scoped roles to their own branch', async () => {
            const {service, prisma} = build();
            await service.findAll(branchUser, {});

            expect(prisma.task.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({companyId: 'company-1', branchId: 'branch-1'})}),
            );
        });

        it('filters overdue tasks by a past due date and excludes DONE/CANCELLED', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {overdue: true} as any);

            const where = (prisma.task.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.dueDate).toEqual({lt: expect.any(Date)});
            expect(where.status).toEqual({notIn: [TaskStatus.DONE, TaskStatus.CANCELLED]});
        });

        it('builds a case-insensitive title search', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {search: 'contract'} as any);

            const where = (prisma.task.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.title).toEqual({contains: 'contract', mode: 'insensitive'});
        });
    });

    describe('findOne', () => {
        it('throws TaskNotFoundException for a task outside the caller scope', async () => {
            const {service} = build({task: null});
            await expect(service.findOne(adminUser, 'missing')).rejects.toThrow(TaskNotFoundException);
        });
    });

    describe('create', () => {
        it('rejects a task linked to more than one of lead/client/deal', async () => {
            const {service} = build({assignee: {id: 'assignee-1', branchId: 'branch-1'}});
            await expect(
                service.create(adminUser, createDto({leadId: 'lead-1', clientId: 'client-1'})),
            ).rejects.toThrow(BadRequestException);
        });

        it('allows a task linked to exactly one entity', async () => {
            const {service} = build({assignee: {id: 'assignee-1', branchId: 'branch-1'}});
            await expect(service.create(adminUser, createDto({leadId: 'lead-1'}))).resolves.toBeDefined();
        });

        it('rejects assigning to a user outside the branch-scoped actor own branch', async () => {
            const {service} = build({assignee: null});
            await expect(service.create(branchUser, createDto())).rejects.toThrow(BadRequestException);
        });

        it('derives branchId from the assignee, not the creating user', async () => {
            const {service, prisma} = build({assignee: {id: 'assignee-1', branchId: 'branch-9'}});
            await service.create(adminUser, createDto());

            expect(prisma.task.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: 'branch-9'})}),
            );
        });

        it('notifies the assignee when the task is assigned to someone else', async () => {
            const {service, notifications} = build({assignee: {id: 'assignee-1', branchId: 'branch-1'}});
            await service.create(adminUser, createDto());

            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'assignee-1', type: 'TASK_ASSIGNED'}),
            );
        });

        it('skips the notification when a user assigns a task to themselves', async () => {
            const {service, notifications} = build({assignee: {id: 'admin-1', branchId: null}});
            await service.create(adminUser, createDto({assignedToId: 'admin-1'}));

            expect(notifications.create).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('404s before validating anything else when the task is out of scope', async () => {
            const {service} = build({task: null});
            await expect(service.update(adminUser, 'missing', {} as any)).rejects.toThrow(TaskNotFoundException);
        });

        it('rejects updating to link more than one entity', async () => {
            const {service} = build({task: {id: 'task-1'}});
            await expect(
                service.update(adminUser, 'task-1', {leadId: 'lead-1', dealId: 'deal-1'} as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('moves the task branch when reassigned to someone in a different branch', async () => {
            const {service, prisma} = build({
                task: {id: 'task-1'},
                assignee: {id: 'assignee-2', branchId: 'branch-2'},
            });

            await service.update(adminUser, 'task-1', {assignedToId: 'assignee-2'} as any);

            expect(prisma.task.update).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: 'branch-2'})}),
            );
        });

        it('leaves branchId untouched when the assignee is not being changed', async () => {
            const {service, prisma} = build({task: {id: 'task-1'}});
            await service.update(adminUser, 'task-1', {title: 'New title'} as any);

            const data = (prisma.task.update as jest.Mock).mock.calls[0][0].data;
            expect(data.branchId).toBeUndefined();
        });
    });

    describe('updateStatus', () => {
        it('404s for a task out of scope', async () => {
            const {service} = build({task: null});
            await expect(service.updateStatus(adminUser, 'missing', {status: TaskStatus.DONE} as any)).rejects.toThrow(
                TaskNotFoundException,
            );
        });

        it('updates the status and outcome fields', async () => {
            const {service, prisma} = build({task: {id: 'task-1'}});
            await service.updateStatus(adminUser, 'task-1', {status: TaskStatus.DONE, outcome: 'Called — qualified'} as any);

            expect(prisma.task.update).toHaveBeenCalledWith({
                where: {id: 'task-1'},
                data: {status: TaskStatus.DONE, outcome: 'Called — qualified'},
                include: expect.anything(),
            });
        });

        it('requires an outcome when closing a task as DONE or CANCELLED', async () => {
            const {service} = build({task: {id: 'task-1', status: TaskStatus.TODO}});
            await expect(
                service.updateStatus(adminUser, 'task-1', {status: TaskStatus.DONE} as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('does not require an outcome for a non-closing transition', async () => {
            const {service, prisma} = build({task: {id: 'task-1', status: TaskStatus.TODO}});
            await service.updateStatus(adminUser, 'task-1', {status: TaskStatus.IN_PROGRESS} as any);

            expect(prisma.task.update).toHaveBeenCalledWith({
                where: {id: 'task-1'},
                data: {status: TaskStatus.IN_PROGRESS, outcome: undefined},
                include: expect.anything(),
            });
        });
    });

    describe('remove', () => {
        it('404s for a task out of scope', async () => {
            const {service} = build({task: null});
            await expect(service.remove(adminUser, 'missing')).rejects.toThrow(TaskNotFoundException);
        });

        it('soft-deletes by setting deletedAt', async () => {
            const {service, prisma} = build({task: {id: 'task-1'}});
            const result = await service.remove(adminUser, 'task-1');

            expect(prisma.task.update).toHaveBeenCalledWith({
                where: {id: 'task-1'},
                data: {deletedAt: expect.any(Date)},
            });
            expect(result).toEqual({success: true});
        });
    });

    describe('getStatusSummary', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.getStatusSummary({...adminUser, companyId: null})).rejects.toThrow(ForbiddenException);
        });

        it('fills every TaskStatus with a zero count when groupBy returns nothing for it', async () => {
            const {service, prisma} = build();
            prisma.task.groupBy.mockResolvedValue([{status: TaskStatus.DONE, _count: {_all: 3}}]);

            const summary = await service.getStatusSummary(adminUser);

            expect(summary).toEqual(
                Object.values(TaskStatus).map((status) => ({
                    status,
                    count: status === TaskStatus.DONE ? 3 : 0,
                })),
            );
        });

        it('scopes branch-scoped roles to their own branch, ignoring any passed branchId', async () => {
            const {service, prisma} = build();
            await service.getStatusSummary(branchUser, 'other-branch');

            expect(prisma.task.groupBy).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-1'})}),
            );
        });
    });

    describe('createAutomated', () => {
        it('returns null without creating a task when the assignee no longer exists', async () => {
            const {service, prisma} = build({assignee: null});

            const result = await service.createAutomated({
                companyId: 'company-1',
                assignedToId: 'gone',
                actorId: 'system',
                title: 'Call John',
                type: TaskType.CALL,
                dueDate: new Date(),
            });

            expect(result).toBeNull();
            expect(prisma.task.create).not.toHaveBeenCalled();
        });

        it('derives branchId from the assignee and defaults priority to MEDIUM', async () => {
            const {service, prisma} = build({assignee: {id: 'assignee-1', branchId: 'branch-9'}});

            await service.createAutomated({
                companyId: 'company-1',
                assignedToId: 'assignee-1',
                actorId: 'system',
                title: 'Call John',
                type: TaskType.CALL,
                dueDate: new Date(),
            });

            expect(prisma.task.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        branchId: 'branch-9',
                        priority: TaskPriority.MEDIUM,
                        type: TaskType.CALL,
                    }),
                }),
            );
        });

        it('notifies the assignee unless they are also the triggering actor', async () => {
            const {service, notifications} = build({assignee: {id: 'assignee-1', branchId: 'branch-9'}});

            await service.createAutomated({
                companyId: 'company-1',
                assignedToId: 'assignee-1',
                actorId: 'assignee-1',
                title: 'Call John',
                type: TaskType.CALL,
                dueDate: new Date(),
            });

            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('logs a CREATED_TASK activity attributed to the triggering actor, not the system', async () => {
            const {service, prisma} = build({assignee: {id: 'assignee-1', branchId: 'branch-9'}});

            await service.createAutomated({
                companyId: 'company-1',
                assignedToId: 'assignee-1',
                actorId: 'lead-creator-1',
                title: 'Call John',
                type: TaskType.CALL,
                dueDate: new Date(),
            });

            expect(prisma.activity.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({userId: 'lead-creator-1'})}),
            );
        });
    });
});

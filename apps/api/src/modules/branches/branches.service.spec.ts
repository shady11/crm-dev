import {BadRequestException, ConflictException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {AuthUser} from '@/common/types/auth-user.type';
import {BranchesService} from './branches.service';

/**
 * BranchesService has no delete path — deactivate()/reactivate() are the
 * only lifecycle, and deactivate() is guarded by an active-user check so a
 * branch can never be switched off out from under people still assigned to
 * it. Name uniqueness is scoped per-company, not global.
 */
describe('BranchesService', () => {
    const user: AuthUser = {
        id: 'user-1',
        email: 'admin@crm.dev',
        name: 'Admin',
        role: 'COMPANY_ADMIN' as any,
        companyId: 'company-1',
        company: null,
        branchId: null,
        branch: null,
    };

    function build(opts: {branch?: unknown; existingName?: unknown; activeUserCount?: number} = {}) {
        const prisma = {
            branch: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockImplementation(({where}: any) => {
                    if (where.name !== undefined) return Promise.resolve(opts.existingName ?? null);
                    return Promise.resolve(opts.branch ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'branch-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'branch-1', ...data})),
            },
            user: {count: jest.fn().mockResolvedValue(opts.activeUserCount ?? 0)},
        };

        const service = new BranchesService(prisma as any);
        return {service, prisma};
    }

    const createDto = (overrides: Record<string, unknown> = {}) => ({name: 'Downtown', ...overrides}) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...user, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('excludes deactivated branches by default', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {});

            expect(prisma.branch.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({deactivatedAt: null})}),
            );
        });

        it('includes deactivated branches when explicitly requested', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {includeDeactivated: true} as any);

            const where = (prisma.branch.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.deactivatedAt).toBeUndefined();
        });
    });

    describe('findOne / findOneWithUsers', () => {
        it('throws NotFoundException outside caller company', async () => {
            const {service} = build({branch: null});
            await expect(service.findOne(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('findOneWithUsers computes users/activeUsers stats', async () => {
            const {service, prisma} = build();
            prisma.branch.findFirst.mockResolvedValue({
                id: 'branch-1',
                users: [
                    {id: 'u1', isActive: true},
                    {id: 'u2', isActive: false},
                    {id: 'u3', isActive: true},
                ],
            });

            const result = await service.findOneWithUsers(user, 'branch-1');

            expect(result.stats).toEqual({users: 3, activeUsers: 2});
        });
    });

    describe('create', () => {
        it('rejects a duplicate branch name within the same company', async () => {
            const {service} = build({existingName: {id: 'branch-existing'}});
            await expect(service.create(user, createDto())).rejects.toThrow(ConflictException);
        });

        it('stamps companyId from the acting user', async () => {
            const {service, prisma} = build();
            await service.create(user, createDto());

            expect(prisma.branch.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({companyId: 'company-1'})}),
            );
        });
    });

    describe('update', () => {
        it('404s before any uniqueness check when the branch is out of scope', async () => {
            const {service, prisma} = build({branch: null});
            await expect(service.update(user, 'missing', {name: 'New'} as any)).rejects.toThrow(NotFoundException);
            expect(prisma.branch.update).not.toHaveBeenCalled();
        });

        it('rejects renaming to a name already used by another branch in the company', async () => {
            const {service} = build({branch: {id: 'branch-1'}, existingName: {id: 'branch-2'}});
            await expect(service.update(user, 'branch-1', {name: 'Taken'} as any)).rejects.toThrow(ConflictException);
        });

        it('excludes the branch itself from its own uniqueness check', async () => {
            const {service, prisma} = build({branch: {id: 'branch-1'}});
            await service.update(user, 'branch-1', {name: 'New Name'} as any);

            expect(prisma.branch.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'branch-1'}})}),
            );
        });

        it('skips the uniqueness check when name is unchanged', async () => {
            const {service, prisma} = build({branch: {id: 'branch-1'}});
            await service.update(user, 'branch-1', {city: 'Osh'} as any);

            expect(prisma.branch.findFirst).toHaveBeenCalledTimes(1); // findOne only
        });
    });

    describe('deactivate', () => {
        it('rejects deactivating an already-deactivated branch', async () => {
            const {service} = build({branch: {id: 'branch-1', deactivatedAt: new Date()}});
            await expect(service.deactivate(user, 'branch-1')).rejects.toThrow(ConflictException);
        });

        it('rejects deactivating a branch with active users still assigned', async () => {
            const {service} = build({branch: {id: 'branch-1', deactivatedAt: null}, activeUserCount: 3});
            await expect(service.deactivate(user, 'branch-1')).rejects.toThrow(BadRequestException);
        });

        it('deactivates a branch with no active users', async () => {
            const {service, prisma} = build({branch: {id: 'branch-1', deactivatedAt: null}, activeUserCount: 0});
            await service.deactivate(user, 'branch-1');

            expect(prisma.branch.update).toHaveBeenCalledWith(
                expect.objectContaining({where: {id: 'branch-1'}, data: {deactivatedAt: expect.any(Date)}}),
            );
        });
    });

    describe('reactivate', () => {
        it('rejects reactivating a branch that is not deactivated', async () => {
            const {service} = build({branch: {id: 'branch-1', deactivatedAt: null}});
            await expect(service.reactivate(user, 'branch-1')).rejects.toThrow(ConflictException);
        });

        it('clears deactivatedAt on a deactivated branch', async () => {
            const {service, prisma} = build({branch: {id: 'branch-1', deactivatedAt: new Date()}});
            await service.reactivate(user, 'branch-1');

            expect(prisma.branch.update).toHaveBeenCalledWith(
                expect.objectContaining({where: {id: 'branch-1'}, data: {deactivatedAt: null}}),
            );
        });
    });
});

import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UserRole} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {ClientsService} from './clients.service';

/**
 * ClientsService enforces two boundaries that matter more than its plain CRUD
 * shape suggests: branch isolation for branch-scoped roles (BR-B1, applied
 * consistently as a 404 rather than a distinguishing 403), and a
 * company-wide (not branch-scoped) uniqueness check on phone number, so two
 * branches can't silently create duplicate client records for the same
 * person just because they can't see each other's data.
 */
describe('ClientsService', () => {
    const branchUser: AuthUser = {
        id: 'user-1',
        email: 'manager@crm.dev',
        name: 'Manager',
        role: UserRole.SALES_MANAGER,
        companyId: 'company-1',
        company: null,
        branchId: 'branch-1',
        branch: null,
    };

    const adminUser: AuthUser = {
        ...branchUser,
        id: 'admin-1',
        role: UserRole.COMPANY_ADMIN,
        branchId: null,
    };

    function build(opts: {client?: unknown; existingPhoneClient?: unknown; branch?: unknown} = {}) {
        const prisma = {
            client: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest
                    .fn()
                    .mockImplementation(({where}: any) => {
                        // ensurePhoneIsUniqueInsideCompany lookups filter by phone; the
                        // findOne/remove/transferBranch lookups filter by id.
                        if (where.phone !== undefined) return Promise.resolve(opts.existingPhoneClient ?? null);
                        return Promise.resolve(opts.client ?? null);
                    }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'client-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'client-1', ...data})),
            },
            branch: {
                findFirst: jest.fn().mockResolvedValue(opts.branch ?? null),
            },
            activity: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        const service = new ClientsService(prisma as any);
        return {service, prisma};
    }

    const createDto = () => ({
        fullName: 'Jane Client',
        phone: '+996700000001',
    }) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...branchUser, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes branch-scoped roles to their own branch', async () => {
            const {service, prisma} = build();
            await service.findAll(branchUser, {});

            expect(prisma.client.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({companyId: 'company-1', branchId: 'branch-1', deletedAt: null}),
                }),
            );
        });

        it('lets a company-wide role optionally narrow to one branch via the query', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {branchId: 'branch-9'} as any);

            expect(prisma.client.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-9'})}),
            );
        });

        it('leaves branch unfiltered for a company-wide role with no branchId in the query', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {});

            const where = (prisma.client.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.branchId).toBeUndefined();
        });

        it('computes pagination meta from total and limit', async () => {
            const {service, prisma} = build();
            prisma.client.count.mockResolvedValue(45);

            const result = await service.findAll(adminUser, {page: 2, limit: 20} as any);

            expect(result.meta).toEqual({page: 2, limit: 20, total: 45, pages: 3});
        });
    });

    describe('findOne', () => {
        it('throws NotFoundException when the client does not exist in the caller scope', async () => {
            const {service} = build({client: null});
            await expect(service.findOne(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('scopes the lookup to the branch for a branch-scoped role', async () => {
            const {service, prisma} = build({client: {id: 'client-1'}});
            await service.findOne(branchUser, 'client-1');

            expect(prisma.client.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({id: 'client-1', companyId: 'company-1', branchId: 'branch-1', deletedAt: null}),
                }),
            );
        });

        it('never applies a branch filter for a company-wide role', async () => {
            const {service, prisma} = build({client: {id: 'client-1'}});
            await service.findOne(adminUser, 'client-1');

            const where = (prisma.client.findFirst as jest.Mock).mock.calls[0][0].where;
            expect(where.branchId).toBeUndefined();
        });
    });

    describe('create', () => {
        it('rejects a duplicate phone within the same company', async () => {
            const {service} = build({existingPhoneClient: {id: 'client-existing'}});
            await expect(service.create(adminUser, createDto())).rejects.toThrow(BadRequestException);
        });

        it('stamps the branch from the acting branch-scoped user, ignoring any request body value', async () => {
            const {service, prisma} = build();
            await service.create(branchUser, createDto());

            expect(prisma.client.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: 'branch-1', companyId: 'company-1'})}),
            );
        });

        it('leaves branchId null for a company-wide role', async () => {
            const {service, prisma} = build();
            await service.create(adminUser, createDto());

            expect(prisma.client.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: null})}),
            );
        });
    });

    describe('update', () => {
        it('404s before checking phone uniqueness when the client is out of scope', async () => {
            const {service, prisma} = build({client: null});
            await expect(service.update(adminUser, 'missing', {phone: '+1'} as any)).rejects.toThrow(NotFoundException);
            expect(prisma.client.update).not.toHaveBeenCalled();
        });

        it('rejects changing the phone to one already used by another client in the company', async () => {
            const {service} = build({client: {id: 'client-1'}, existingPhoneClient: {id: 'client-2'}});
            await expect(service.update(adminUser, 'client-1', {phone: '+996700000009'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('excludes the client itself from its own phone-uniqueness check', async () => {
            const {service, prisma} = build({client: {id: 'client-1'}});
            await service.update(adminUser, 'client-1', {phone: '+996700000009'} as any);

            expect(prisma.client.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'client-1'}})}),
            );
        });

        it('does not run the phone-uniqueness check when phone is left unchanged', async () => {
            const {service, prisma} = build({client: {id: 'client-1'}});
            await service.update(adminUser, 'client-1', {fullName: 'New Name'} as any);

            expect(prisma.client.findFirst).toHaveBeenCalledTimes(1); // findOne only
        });
    });

    describe('remove', () => {
        it('throws NotFoundException for a client outside the caller scope', async () => {
            const {service} = build({client: null});
            await expect(service.remove(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('soft-deletes by setting deletedAt rather than issuing a hard delete', async () => {
            const {service, prisma} = build({client: {id: 'client-1', branchId: null}});
            const result = await service.remove(adminUser, 'client-1');

            expect(prisma.client.update).toHaveBeenCalledWith({
                where: {id: 'client-1'},
                data: {deletedAt: expect.any(Date)},
            });
            expect(result).toEqual({success: true});
        });
    });

    describe('transferBranch', () => {
        it('throws NotFoundException when the client is missing from the company', async () => {
            const {service} = build({client: null});
            await expect(service.transferBranch(adminUser, 'missing', {branchId: 'branch-2'} as any)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('rejects a target branch that does not belong to the company or is deactivated', async () => {
            const {service} = build({client: {id: 'client-1', branchId: 'branch-1'}, branch: null});
            await expect(service.transferBranch(adminUser, 'client-1', {branchId: 'branch-2'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('updates the branch and logs an activity recording the move', async () => {
            const {service, prisma} = build({
                client: {id: 'client-1', branchId: 'branch-1'},
                branch: {id: 'branch-2'},
            });

            await service.transferBranch(adminUser, 'client-1', {branchId: 'branch-2'} as any);

            expect(prisma.client.update).toHaveBeenCalledWith({
                where: {id: 'client-1'},
                data: {branchId: 'branch-2'},
            });
            expect(prisma.activity.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        clientId: 'client-1',
                        metadata: {fromBranchId: 'branch-1', toBranchId: 'branch-2'},
                    }),
                }),
            );
        });
    });
});

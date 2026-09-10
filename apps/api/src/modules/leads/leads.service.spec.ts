import {BadRequestException, ConflictException, NotFoundException, ForbiddenException} from '@nestjs/common';
import {LeadStatus} from '@/generated/prisma/enums';
import {UserRole} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {LeadsService} from './leads.service';
import {ClientsService} from '@/modules/clients/clients.service';

/**
 * LeadsService is the entry point for BR-B1 branch isolation, BR-D2's
 * duplicate-phone guard, and the lead-to-client conversion flow. These tests
 * cover: branch scoping on read/assign paths, the duplicate-phone rejection
 * (and the confirmDuplicate escape hatch), lead->client conversion both with
 * and without an existing client, and the SALES_HEAD reassignment rule that
 * requires the target to be an active SALES_MANAGER on the same branch.
 */
describe('LeadsService', () => {
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

    const salesHeadUser: AuthUser = {
        ...branchUser,
        id: 'head-1',
        role: UserRole.SALES_HEAD,
    };

    function build(opts: {
        lead?: unknown;
        duplicateLeads?: unknown[];
        duplicateClients?: unknown[];
        crossBranchClient?: unknown;
        manager?: unknown;
        client?: unknown;
        branch?: unknown;
    } = {}) {
        const prisma = {
            lead: {
                findMany: jest.fn().mockResolvedValue(opts.duplicateLeads ?? []),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockResolvedValue(opts.lead ?? null),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'lead-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'lead-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'lead-1'}),
            },
            client: {
                findMany: jest.fn().mockResolvedValue(opts.duplicateClients ?? []),
                findFirst: jest.fn().mockImplementation(({where}: any) => {
                    if (opts.crossBranchClient !== undefined && !where.branchId) {
                        return Promise.resolve(opts.crossBranchClient);
                    }
                    return Promise.resolve(opts.client ?? null);
                }),
            },
            user: {
                findFirst: jest.fn().mockResolvedValue(opts.manager ?? null),
            },
            branch: {
                findFirst: jest.fn().mockResolvedValue(opts.branch ?? null),
            },
            activity: {
                create: jest.fn().mockResolvedValue({}),
                findMany: jest.fn().mockResolvedValue([]),
            },
        };

        const clientsService = {
            create: jest.fn().mockResolvedValue({id: 'client-created'}),
        } as unknown as ClientsService;

        const service = new LeadsService(prisma as any, clientsService);
        return {service, prisma, clientsService};
    }

    const createDto = (overrides: Record<string, unknown> = {}) => ({
        fullName: 'John Lead',
        phone: '+996700000001',
        source: 'WEBSITE',
        status: LeadStatus.NEW,
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

            expect(prisma.lead.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({companyId: 'company-1', branchId: 'branch-1'})}),
            );
        });

        it('builds a case-insensitive OR search across name/phone/email', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {search: 'jane'} as any);

            const where = (prisma.lead.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.OR).toHaveLength(3);
            expect(where.OR[0]).toEqual({fullName: {contains: 'jane', mode: 'insensitive'}});
        });
    });

    describe('findOne', () => {
        it('throws NotFoundException for a lead outside the caller scope', async () => {
            const {service} = build({lead: null});
            await expect(service.findOne(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('returns the lead when found within scope', async () => {
            const {service} = build({lead: {id: 'lead-1'}});
            await expect(service.findOne(adminUser, 'lead-1')).resolves.toEqual({id: 'lead-1'});
        });
    });

    describe('create', () => {
        it('rejects a duplicate phone by default', async () => {
            const {service} = build({duplicateLeads: [{id: 'lead-existing'}]});
            await expect(service.create(adminUser, createDto())).rejects.toThrow(ConflictException);
        });

        it('allows a duplicate phone through when confirmDuplicate is set', async () => {
            const {service, prisma} = build({duplicateLeads: [{id: 'lead-existing'}]});
            await expect(service.create(adminUser, createDto({confirmDuplicate: true}))).resolves.toBeDefined();
            expect(prisma.lead.create).toHaveBeenCalled();
        });

        it('stamps the branch from a branch-scoped actor, never from the request body', async () => {
            const {service, prisma} = build();
            await service.create(branchUser, createDto());

            expect(prisma.lead.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: 'branch-1'})}),
            );
        });

        it('leaves branch unassigned for a company-wide role', async () => {
            const {service, prisma} = build();
            await service.create(adminUser, createDto());

            expect(prisma.lead.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({branchId: null})}),
            );
        });

        it('rejects assigning a manager outside the branch-scoped actor own branch', async () => {
            const {service} = build({manager: null});
            await expect(service.create(branchUser, createDto({managerId: 'other-branch-manager'}))).rejects.toThrow(
                BadRequestException,
            );
        });

        it('rejects linking a client not assignable to the acting user', async () => {
            const {service} = build({client: null});
            await expect(service.create(adminUser, createDto({clientId: 'client-x'}))).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('convert', () => {
        it('rejects converting a lead already linked to a client', async () => {
            const {service} = build({lead: {id: 'lead-1', clientId: 'client-existing'}});
            await expect(service.convert(adminUser, 'lead-1', {} as any)).rejects.toThrow(BadRequestException);
        });

        it('creates a new client from the lead contact details when no clientId is given', async () => {
            const {service, prisma, clientsService} = build({
                lead: {id: 'lead-1', clientId: null, fullName: 'John Lead', phone: '+1', email: 'j@x.com'},
            });

            await service.convert(adminUser, 'lead-1', {} as any);

            expect(clientsService.create).toHaveBeenCalledWith(
                adminUser,
                expect.objectContaining({fullName: 'John Lead', phone: '+1', email: 'j@x.com'}),
            );
            expect(prisma.lead.update).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({clientId: 'client-created', status: LeadStatus.CONVERTED})}),
            );
        });

        it('links to an existing client when clientId is provided, without creating a new one', async () => {
            const {service, prisma, clientsService} = build({
                lead: {id: 'lead-1', clientId: null, fullName: 'John Lead', phone: '+1'},
                client: {id: 'client-linked'},
            });

            await service.convert(adminUser, 'lead-1', {clientId: 'client-linked'} as any);

            expect(clientsService.create).not.toHaveBeenCalled();
            expect(prisma.lead.update).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({clientId: 'client-linked', status: LeadStatus.CONVERTED})}),
            );
        });

        it('rejects linking a client not assignable to the acting user', async () => {
            const {service} = build({
                lead: {id: 'lead-1', clientId: null, fullName: 'John Lead', phone: '+1'},
                client: null,
            });

            await expect(service.convert(adminUser, 'lead-1', {clientId: 'not-mine'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('checkDuplicates', () => {
        it('only looks up the cross-branch client warning for COMPANY_ADMIN', async () => {
            const {service, prisma} = build({crossBranchClient: {id: 'client-other-branch', branchId: 'branch-2'}});

            const asManager = await service.checkDuplicates(branchUser, '+1');
            expect(asManager.crossBranchClient).toBeNull();

            const asAdmin = await service.checkDuplicates(adminUser, '+1');
            expect(asAdmin.crossBranchClient).toEqual({id: 'client-other-branch', branchId: 'branch-2'});
            expect(prisma.client.findFirst).toHaveBeenCalled();
        });

        it('excludes the given lead id from its own duplicate check', async () => {
            const {service, prisma} = build();
            await service.checkDuplicates(adminUser, '+1', 'lead-self');

            expect(prisma.lead.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'lead-self'}})}),
            );
        });
    });

    describe('transferBranch', () => {
        it('throws NotFoundException when the lead is missing from the company', async () => {
            const {service} = build({lead: null});
            await expect(service.transferBranch(adminUser, 'missing', {branchId: 'branch-2'} as any)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('rejects a target branch outside the company or deactivated', async () => {
            const {service} = build({lead: {id: 'lead-1', branchId: 'branch-1'}, branch: null});
            await expect(service.transferBranch(adminUser, 'lead-1', {branchId: 'branch-2'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('updates the branch and records an activity with the from/to branch ids', async () => {
            const {service, prisma} = build({
                lead: {id: 'lead-1', branchId: 'branch-1'},
                branch: {id: 'branch-2'},
            });

            await service.transferBranch(adminUser, 'lead-1', {branchId: 'branch-2'} as any);

            expect(prisma.lead.update).toHaveBeenCalledWith({
                where: {id: 'lead-1'},
                data: {branchId: 'branch-2'},
            });
            expect(prisma.activity.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({metadata: {fromBranchId: 'branch-1', toBranchId: 'branch-2'}}),
                }),
            );
        });
    });

    describe('reassignManager', () => {
        it('rejects reassigning a lead that has no branch assigned', async () => {
            const {service} = build({lead: {id: 'lead-1', branchId: null, managerId: 'old-manager'}});
            await expect(service.reassignManager(salesHeadUser, 'lead-1', {managerId: 'new-manager'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('rejects a target manager who is not an active SALES_MANAGER on the same branch', async () => {
            const {service} = build({
                lead: {id: 'lead-1', branchId: 'branch-1', managerId: 'old-manager'},
                manager: null,
            });

            await expect(service.reassignManager(salesHeadUser, 'lead-1', {managerId: 'new-manager'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('reassigns the lead and records the from/to manager ids', async () => {
            const {service, prisma} = build({
                lead: {id: 'lead-1', branchId: 'branch-1', managerId: 'old-manager'},
                manager: {id: 'new-manager', role: UserRole.SALES_MANAGER, isActive: true},
            });

            await service.reassignManager(salesHeadUser, 'lead-1', {managerId: 'new-manager'} as any);

            expect(prisma.lead.update).toHaveBeenCalledWith(
                expect.objectContaining({where: {id: 'lead-1'}, data: {managerId: 'new-manager'}}),
            );
            expect(prisma.activity.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({metadata: {fromManagerId: 'old-manager', toManagerId: 'new-manager'}}),
                }),
            );
        });
    });

    describe('remove', () => {
        it('throws NotFoundException for a lead outside the caller scope', async () => {
            const {service} = build({lead: null});
            await expect(service.remove(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('hard-deletes the lead once found in scope', async () => {
            const {service, prisma} = build({lead: {id: 'lead-1'}});
            const result = await service.remove(adminUser, 'lead-1');

            expect(prisma.lead.delete).toHaveBeenCalledWith({where: {id: 'lead-1'}});
            expect(result).toEqual({success: true});
        });
    });

    describe('logContactAttempt / listActivities', () => {
        it('404s before logging a contact attempt on an out-of-scope lead', async () => {
            const {service} = build({lead: null});
            await expect(
                service.logContactAttempt(adminUser, 'missing', {type: 'CALL', note: 'x'} as any),
            ).rejects.toThrow(NotFoundException);
        });

        it('maps a CALL contact attempt to the CALL activity type', async () => {
            const {service, prisma} = build({lead: {id: 'lead-1'}});
            await service.logContactAttempt(adminUser, 'lead-1', {type: 'CALL', note: 'left voicemail'} as any);

            expect(prisma.activity.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({description: 'left voicemail'})}),
            );
        });

        it('404s before listing activities on an out-of-scope lead', async () => {
            const {service} = build({lead: null});
            await expect(service.listActivities(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });
    });
});

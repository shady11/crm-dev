import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {ProjectStatus} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {ProjectsService} from './projects.service';

/**
 * ProjectsService: name uniqueness scoped per-company, and remove()'s guard
 * against deleting a project that still has blocks or units attached —
 * without it, deleting a project would either orphan or cascade-delete a
 * whole building hierarchy silently.
 */
describe('ProjectsService', () => {
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

    function build(opts: {project?: unknown; existingName?: unknown} = {}) {
        const prisma = {
            project: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockImplementation(({where}: any) => {
                    if (where.name !== undefined) return Promise.resolve(opts.existingName ?? null);
                    return Promise.resolve(opts.project ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'project-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'project-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'project-1'}),
            },
        };

        const service = new ProjectsService(prisma as any);
        return {service, prisma};
    }

    const createDto = (overrides: Record<string, unknown> = {}) => ({name: 'Skyline', ...overrides}) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...user, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes to the caller company and applies an optional status filter', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {status: ProjectStatus.ACTIVE} as any);

            expect(prisma.project.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {companyId: 'company-1', status: ProjectStatus.ACTIVE}}),
            );
        });

        it('builds a case-insensitive search across name and address', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {search: 'skyline'} as any);

            const where = (prisma.project.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.OR).toEqual([
                {name: {contains: 'skyline', mode: 'insensitive'}},
                {address: {contains: 'skyline', mode: 'insensitive'}},
            ]);
        });
    });

    describe('findOne / getTree', () => {
        it('findOne throws NotFoundException outside caller company', async () => {
            const {service} = build({project: null});
            await expect(service.findOne(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('getTree throws NotFoundException outside caller company', async () => {
            const {service} = build({project: null});
            await expect(service.getTree(user, 'missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('rejects a duplicate project name within the same company', async () => {
            const {service} = build({existingName: {id: 'project-existing'}});
            await expect(service.create(user, createDto())).rejects.toThrow(BadRequestException);
        });

        it('defaults status to DRAFT when none is given', async () => {
            const {service, prisma} = build();
            await service.create(user, createDto());

            expect(prisma.project.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({status: ProjectStatus.DRAFT, companyId: 'company-1'})}),
            );
        });

        it('honors an explicit status', async () => {
            const {service, prisma} = build();
            await service.create(user, createDto({status: ProjectStatus.ACTIVE}));

            expect(prisma.project.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({status: ProjectStatus.ACTIVE})}),
            );
        });
    });

    describe('update', () => {
        it('404s before checking name uniqueness when the project is out of scope', async () => {
            const {service, prisma} = build({project: null});
            await expect(service.update(user, 'missing', {name: 'New'} as any)).rejects.toThrow(NotFoundException);
            expect(prisma.project.update).not.toHaveBeenCalled();
        });

        it('rejects renaming to a name already used by another project in the company', async () => {
            const {service} = build({project: {id: 'project-1'}, existingName: {id: 'project-2'}});
            await expect(service.update(user, 'project-1', {name: 'Taken'} as any)).rejects.toThrow(BadRequestException);
        });

        it('excludes the project itself from its own uniqueness check', async () => {
            const {service, prisma} = build({project: {id: 'project-1'}});
            await service.update(user, 'project-1', {name: 'New Name'} as any);

            expect(prisma.project.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'project-1'}})}),
            );
        });

        it('skips the uniqueness check when name is unchanged', async () => {
            const {service, prisma} = build({project: {id: 'project-1'}});
            await service.update(user, 'project-1', {address: 'New address'} as any);

            expect(prisma.project.findFirst).toHaveBeenCalledTimes(1); // findOne only
        });
    });

    describe('remove', () => {
        it('404s for a project outside the caller company', async () => {
            const {service} = build({project: null});
            await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('rejects deleting a project that still has blocks', async () => {
            const {service} = build({project: {id: 'project-1', _count: {blocks: 2, units: 0}}});
            await expect(service.remove(user, 'project-1')).rejects.toThrow(BadRequestException);
        });

        it('rejects deleting a project that still has units', async () => {
            const {service} = build({project: {id: 'project-1', _count: {blocks: 0, units: 5}}});
            await expect(service.remove(user, 'project-1')).rejects.toThrow(BadRequestException);
        });

        it('deletes a project with no blocks or units', async () => {
            const {service, prisma} = build({project: {id: 'project-1', _count: {blocks: 0, units: 0}}});
            const result = await service.remove(user, 'project-1');

            expect(prisma.project.delete).toHaveBeenCalledWith({where: {id: 'project-1'}});
            expect(result).toEqual({success: true});
        });
    });
});

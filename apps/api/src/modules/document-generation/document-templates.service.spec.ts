import {ForbiddenException} from '@nestjs/common';
import {DocumentType} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {DocumentTemplatesService} from './document-templates.service';

/**
 * At most one template may be active per (company, type) — upsert()'s
 * versioning and deactivation-of-the-previous-row is what keeps a Document
 * already generated from an older template resolvable, instead of being
 * overwritten out from under it.
 */
describe('DocumentTemplatesService', () => {
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

    function build(opts: {previous?: unknown} = {}) {
        const prisma = {
            documentTemplate: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn().mockResolvedValue(opts.previous ?? null),
                update: jest.fn().mockResolvedValue({}),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'tpl-new', ...data})),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };

        const service = new DocumentTemplatesService(prisma as any);
        return {service, prisma};
    }

    const upsertDto = (overrides: Record<string, unknown> = {}) => ({
        type: DocumentType.CONTRACT,
        name: 'Contract v2',
        bodyHtml: '<html></html>',
        ...overrides,
    }) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...user, companyId: null})).rejects.toThrow(ForbiddenException);
        });

        it('only returns active, non-deleted templates for the caller company', async () => {
            const {service, prisma} = build();
            await service.findAll(user);

            expect(prisma.documentTemplate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {companyId: 'company-1', isActive: true, deletedAt: null}}),
            );
        });
    });

    describe('findByType', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findByType({...user, companyId: null}, DocumentType.CONTRACT)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('scopes the lookup to the caller company and the given type', async () => {
            const {service, prisma} = build();
            await service.findByType(user, DocumentType.CONTRACT);

            expect(prisma.documentTemplate.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: {companyId: 'company-1', type: DocumentType.CONTRACT, isActive: true, deletedAt: null}}),
            );
        });
    });

    describe('upsert', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.upsert({...user, companyId: null}, upsertDto())).rejects.toThrow(ForbiddenException);
        });

        it('deactivates the previous active template for the same type', async () => {
            const {service, prisma} = build({previous: {id: 'tpl-old', version: 3}});
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.update).toHaveBeenCalledWith({
                where: {id: 'tpl-old'},
                data: {isActive: false},
            });
        });

        it('never deactivates anything when there is no previous active template', async () => {
            const {service, prisma} = build({previous: null});
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.update).not.toHaveBeenCalled();
        });

        it('starts a brand-new template type at version 1', async () => {
            const {service, prisma} = build({previous: null});
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({version: 1})}),
            );
        });

        it('increments the version past the previous active template', async () => {
            const {service, prisma} = build({previous: {id: 'tpl-old', version: 3}});
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({version: 4})}),
            );
        });

        it('stamps createdById from the acting user', async () => {
            const {service, prisma} = build();
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({createdById: 'user-1'})}),
            );
        });
    });
});

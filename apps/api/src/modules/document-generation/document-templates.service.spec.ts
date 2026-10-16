import {BadRequestException, ForbiddenException} from '@nestjs/common';
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
        roleId: 'role-company-admin',
        roleName: 'Company Admin',
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
            activity: {create: jest.fn().mockResolvedValue({id: 'activity-1'})},
            company: {findUniqueOrThrow: jest.fn().mockResolvedValue({
                name: 'Bishkek Dev', legalName: 'ОсОО «Бишкек Девелопмент»', address: 'Бишкек', phone: null,
                taxId: '01234567890123', signatoryName: 'Асанов Нурлан', signatoryTitle: 'Директор', currency: 'KGS',
            })},
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

    describe('template editor (CA-5)', () => {
        it('refuses to save a template with a placeholder that does not exist, and saves nothing', async () => {
            const {service, prisma} = build();
            await expect(service.upsert(user, upsertDto({bodyHtml: '<p>{{client.fullNmae}}</p>'})))
                .rejects.toThrow(BadRequestException);
            expect(prisma.documentTemplate.create).not.toHaveBeenCalled();
        });

        it('refuses broken template syntax', async () => {
            const {service} = build();
            await expect(service.preview(user, DocumentType.CONTRACT, '<p>{{#if deal.note}}open</p>'))
                .rejects.toThrow(BadRequestException);
        });

        it('previews with sample data and the company\'s own legal details', async () => {
            const {service} = build();
            const {html} = await service.preview(user, DocumentType.CONTRACT,
                '<p>{{company.legalName}}, {{company.signatoryName}}: {{client.fullName}} {{#each schedule.rows}}[{{order}}]{{/each}}</p>');
            expect(html).toBe('<p>ОсОО «Бишкек Девелопмент», Асанов Нурлан: Айгерим Токтогулова [1][2]</p>');
        });

        it('previews every built-in default without error', async () => {
            const {service} = build();
            for (const type of [DocumentType.RESERVATION, DocumentType.CONTRACT, DocumentType.PAYMENT_RECEIPT]) {
                const {defaultHtml} = await service.editor(user, type);
                await expect(service.preview(user, type, defaultHtml)).resolves.toEqual({html: expect.stringContaining('2026-0042')});
            }
        });

        it('offers payment placeholders only on a receipt', async () => {
            const {service} = build();
            const tokens = async (type: DocumentType) => (await service.editor(user, type)).placeholders.map((p) => p.token);
            expect(await tokens(DocumentType.PAYMENT_RECEIPT)).toEqual(expect.arrayContaining(['{{payment.receiptNumber}}', '{{totals.remaining}}']));
            expect(await tokens(DocumentType.CONTRACT)).not.toContain('{{payment.receiptNumber}}');
            expect(await tokens(DocumentType.CONTRACT)).toEqual(expect.arrayContaining(['{{client.passport}}', '{{today}}']));
        });

        it('returns the active template and its history', async () => {
            const {service, prisma} = build();
            prisma.documentTemplate.findMany.mockResolvedValue([
                {id: 'tpl-2', version: 2, isActive: true}, {id: 'tpl-1', version: 1, isActive: false},
            ]);
            const editor = await service.editor(user, DocumentType.CONTRACT);
            expect(editor.current).toEqual(expect.objectContaining({id: 'tpl-2'}));
            expect(editor.versions).toHaveLength(2);
        });

        it('goes back to the default by switching the active template off, and logs it', async () => {
            const {service, prisma} = build({previous: {id: 'tpl-2', name: 'Contract v2', version: 2}});
            await expect(service.resetToDefault(user, DocumentType.CONTRACT)).resolves.toEqual({reset: true});
            expect(prisma.documentTemplate.update).toHaveBeenCalledWith({where: {id: 'tpl-2'}, data: {isActive: false}});
            expect(prisma.activity.create.mock.calls[0][0].data.templateKey).toBe('documentTemplateReset');
        });

        it('refuses a type no template is used for', async () => {
            const {service} = build();
            await expect(service.editor(user, DocumentType.OTHER)).rejects.toThrow(BadRequestException);
        });
    });

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

        it('numbers a save after a reset past the newest version, not from 1 again', async () => {
            const {service, prisma} = build();
            // Nothing active (reset to the default), but versions 1–2 exist.
            prisma.documentTemplate.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({version: 2});
            await service.upsert(user, upsertDto());

            expect(prisma.documentTemplate.update).not.toHaveBeenCalled();
            expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({version: 3})}),
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

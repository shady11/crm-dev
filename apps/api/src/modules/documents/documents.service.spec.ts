import {BadRequestException, ForbiddenException} from '@nestjs/common';
import {DocumentOwnerType, DocumentType, NotificationType, UserRole} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {DocumentsService} from './documents.service';
import {DocumentNotFoundException} from './exceptions/document-not-found.exception';

/**
 * DocumentsService covers three things worth pinning down: the owner-entity
 * existence/company-scope check before a file is ever stored (so a document
 * can never attach to a lead/client/deal/project/unit outside the caller's
 * own company), the deal-manager upload notification (skipped when the
 * uploader IS the manager, so nobody gets pinged about their own upload),
 * and soft-delete semantics.
 */
describe('DocumentsService', () => {
    const user: AuthUser = {
        id: 'user-1',
        email: 'user@crm.dev',
        name: 'User',
        role: UserRole.SALES_MANAGER,
        companyId: 'company-1',
        company: null,
        branchId: 'branch-1',
        branch: null,
    };

    function build(opts: {owner?: unknown; document?: unknown; deal?: unknown} = {}) {
        const prisma = {
            document: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockResolvedValue(opts.document ?? null),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'doc-new', ...data})),
                update: jest.fn().mockResolvedValue({}),
            },
            lead: {findFirst: jest.fn().mockResolvedValue(opts.owner ?? null)},
            client: {findFirst: jest.fn().mockResolvedValue(opts.owner ?? null)},
            deal: {
                findFirst: jest.fn().mockResolvedValue(opts.owner ?? null),
                findUnique: jest.fn().mockResolvedValue(opts.deal ?? null),
            },
            project: {findFirst: jest.fn().mockResolvedValue(opts.owner ?? null)},
            unit: {findFirst: jest.fn().mockResolvedValue(opts.owner ?? null)},
        };

        const notifications = {create: jest.fn().mockResolvedValue({})};
        const storage = {
            save: jest.fn().mockResolvedValue('company-1/stored.pdf'),
            getStream: jest.fn().mockResolvedValue('stream'),
        };

        const service = new DocumentsService(prisma as any, notifications as any, storage as any);
        return {service, prisma, notifications, storage};
    }

    const file = (overrides: Partial<Express.Multer.File> = {}) =>
        ({
            originalname: 'contract.pdf',
            mimetype: 'application/pdf',
            buffer: Buffer.from('%PDF-fake'),
            size: 9,
            ...overrides,
        }) as Express.Multer.File;

    const uploadDto = (overrides: Record<string, unknown> = {}) => ({
        ownerType: DocumentOwnerType.LEAD,
        ownerId: 'lead-1',
        ...overrides,
    }) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...user, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes to the caller company and excludes soft-deleted rows', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {});

            expect(prisma.document.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({companyId: 'company-1', deletedAt: null})}),
            );
        });

        it('builds a case-insensitive search on originalName', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {search: 'contract'} as any);

            expect(prisma.document.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({originalName: {contains: 'contract', mode: 'insensitive'}})}),
            );
        });
    });

    describe('findOne', () => {
        it('throws DocumentNotFoundException outside the caller scope', async () => {
            const {service} = build({document: null});
            await expect(service.findOne(user, 'missing')).rejects.toThrow(DocumentNotFoundException);
        });

        it('returns the document when found within scope', async () => {
            const {service} = build({document: {id: 'doc-1'}});
            await expect(service.findOne(user, 'doc-1')).resolves.toEqual({id: 'doc-1'});
        });
    });

    describe('upload', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.upload({...user, companyId: null}, file(), uploadDto())).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('rejects when no file is given', async () => {
            const {service} = build({owner: {id: 'lead-1'}});
            await expect(service.upload(user, undefined as any, uploadDto())).rejects.toThrow(BadRequestException);
        });

        it('rejects when the owner entity does not exist in the caller company', async () => {
            const {service} = build({owner: null});
            await expect(service.upload(user, file(), uploadDto())).rejects.toThrow(BadRequestException);
        });

        it.each([
            [DocumentOwnerType.LEAD, 'lead'],
            [DocumentOwnerType.CLIENT, 'client'],
            [DocumentOwnerType.DEAL, 'deal'],
            [DocumentOwnerType.PROJECT, 'project'],
            [DocumentOwnerType.UNIT, 'unit'],
        ])('validates a %s owner via the matching model lookup', async (ownerType: DocumentOwnerType, _label: string) => {
            const {service, prisma} = build({owner: {id: 'owner-1'}});
            await service.upload(user, file(), uploadDto({ownerType, ownerId: 'owner-1'}));

            const model = (prisma as any)[
                ownerType === DocumentOwnerType.LEAD ? 'lead'
                    : ownerType === DocumentOwnerType.CLIENT ? 'client'
                    : ownerType === DocumentOwnerType.DEAL ? 'deal'
                    : ownerType === DocumentOwnerType.PROJECT ? 'project'
                    : 'unit'
            ];
            expect(model.findFirst).toHaveBeenCalled();
        });

        it('derives extension from the original filename, lowercased', async () => {
            const {service, prisma} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file({originalname: 'Scan.PDF'}), uploadDto());

            expect(prisma.document.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({extension: 'pdf'})}),
            );
        });

        it('handles a file with no extension', async () => {
            const {service, prisma} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file({originalname: 'noext'}), uploadDto());

            expect(prisma.document.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({extension: ''})}),
            );
        });

        it('defaults document type to OTHER when none is given', async () => {
            const {service, prisma} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file(), uploadDto());

            expect(prisma.document.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({type: DocumentType.OTHER})}),
            );
        });

        it('honors an explicit document type', async () => {
            const {service, prisma} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file(), uploadDto({type: DocumentType.CONTRACT}));

            expect(prisma.document.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({type: DocumentType.CONTRACT})}),
            );
        });

        it('saves the file buffer under the caller company before creating the DB row', async () => {
            const {service, storage} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file(), uploadDto());

            expect(storage.save).toHaveBeenCalledWith('company-1', expect.any(String), expect.any(Buffer));
        });

        it('notifies the deal manager on a DEAL-owned upload when someone else uploaded it', async () => {
            const {service, notifications} = build({
                owner: {id: 'deal-1'},
                deal: {managerId: 'manager-2', dealNumber: '2026-0001', companyId: 'company-1'},
            });

            await service.upload(user, file(), uploadDto({ownerType: DocumentOwnerType.DEAL, ownerId: 'deal-1'}));

            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'manager-2', type: NotificationType.DOCUMENT_UPLOADED, entityId: 'deal-1'}),
            );
        });

        it('never notifies when the uploader is the deal manager themselves', async () => {
            const {service, notifications} = build({
                owner: {id: 'deal-1'},
                deal: {managerId: 'user-1', dealNumber: '2026-0001', companyId: 'company-1'},
            });

            await service.upload(user, file(), uploadDto({ownerType: DocumentOwnerType.DEAL, ownerId: 'deal-1'}));

            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('never notifies when the deal has no manager assigned', async () => {
            const {service, notifications} = build({
                owner: {id: 'deal-1'},
                deal: {managerId: null, dealNumber: '2026-0001', companyId: 'company-1'},
            });

            await service.upload(user, file(), uploadDto({ownerType: DocumentOwnerType.DEAL, ownerId: 'deal-1'}));

            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('never notifies for a non-DEAL owner type', async () => {
            const {service, notifications, prisma} = build({owner: {id: 'lead-1'}});
            await service.upload(user, file(), uploadDto());

            expect(notifications.create).not.toHaveBeenCalled();
            expect(prisma.deal.findUnique).not.toHaveBeenCalled();
        });
    });

    describe('getFileForDownload', () => {
        it('404s outside the caller scope before ever touching storage', async () => {
            const {service, storage} = build({document: null});
            await expect(service.getFileForDownload(user, 'missing')).rejects.toThrow(DocumentNotFoundException);
            expect(storage.getStream).not.toHaveBeenCalled();
        });

        it('streams by the document own stored path', async () => {
            const {service, storage} = build({document: {id: 'doc-1', path: 'company-1/stored.pdf'}});
            const result = await service.getFileForDownload(user, 'doc-1');

            expect(storage.getStream).toHaveBeenCalledWith('company-1/stored.pdf');
            expect(result.document).toEqual({id: 'doc-1', path: 'company-1/stored.pdf'});
            expect(result.stream).toBe('stream');
        });
    });

    describe('remove', () => {
        it('404s outside the caller scope', async () => {
            const {service} = build({document: null});
            await expect(service.remove(user, 'missing')).rejects.toThrow(DocumentNotFoundException);
        });

        it('soft-deletes by setting deletedAt', async () => {
            const {service, prisma} = build({document: {id: 'doc-1'}});
            const result = await service.remove(user, 'doc-1');

            expect(prisma.document.update).toHaveBeenCalledWith({
                where: {id: 'doc-1'},
                data: {deletedAt: expect.any(Date)},
            });
            expect(result).toEqual({success: true});
        });
    });
});

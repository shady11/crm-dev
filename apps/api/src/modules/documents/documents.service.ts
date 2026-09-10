import {randomUUID} from "crypto";
import {extname} from "path";
import {BadRequestException, ForbiddenException, Inject, Injectable} from "@nestjs/common";
import {
    DocumentOwnerType,
    DocumentType,
    NotificationEntityType,
    NotificationType,
    Prisma
} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {UploadDocumentDto} from "./dto/upload-document.dto";
import {QueryDocumentsDto} from "./dto/query-documents.dto";
import {DocumentNotFoundException} from "./exceptions/document-not-found.exception";
import {FILE_STORAGE_PROVIDER, FileStorageProvider} from "./storage/file-storage.interface";
import {NotificationsService} from "@/modules/notifications/notifications.service";

const DOCUMENT_INCLUDE = {
    uploadedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        @Inject(FILE_STORAGE_PROVIDER) private readonly storage: FileStorageProvider,
    ) {}

    async findAll(user: AuthUser, query: QueryDocumentsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.DocumentWhereInput = {
            companyId: user.companyId,
            deletedAt: null,
            ownerType: query.ownerType,
            ownerId: query.ownerId,
            type: query.type,
        };

        if (query.search) {
            where.originalName = { contains: query.search, mode: "insensitive" };
        }

        const [items, total] = await Promise.all([
            this.prisma.document.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: "desc" },
                include: DOCUMENT_INCLUDE,
            }),
            this.prisma.document.count({ where }),
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

        const document = await this.prisma.document.findFirst({
            where: { id, companyId: user.companyId, deletedAt: null },
            include: DOCUMENT_INCLUDE,
        });

        if (!document) throw new DocumentNotFoundException(id);

        return document;
    }

    async upload(user: AuthUser, file: Express.Multer.File, dto: UploadDocumentDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }
        if (!file) {
            throw new BadRequestException("File is required.");
        }

        const companyId = user.companyId;
        await this.ensureOwnerExists(dto.ownerType, dto.ownerId, companyId);

        const extension = extname(file.originalname).replace(".", "").toLowerCase();
        const storedName = `${randomUUID()}${extension ? `.${extension}` : ""}`;
        const relativePath = await this.storage.save(companyId, storedName, file.buffer);

        const document = await this.prisma.document.create({
            data: {
                name: storedName,
                originalName: file.originalname,
                mimeType: file.mimetype,
                extension,
                size: file.size,
                path: relativePath,
                type: dto.type ?? DocumentType.OTHER,
                ownerType: dto.ownerType,
                ownerId: dto.ownerId,
                companyId,
                uploadedById: user.id,
            },
            include: DOCUMENT_INCLUDE,
        });

        if (dto.ownerType === DocumentOwnerType.DEAL) {
            const deal = await this.prisma.deal.findUnique({
                where: { id: dto.ownerId },
                select: { managerId: true, dealNumber: true, companyId: true },
            });

            if (deal?.managerId && deal.managerId !== user.id) {
                await this.notifications.create({
                    companyId,
                    userId: deal.managerId,
                    type: NotificationType.DOCUMENT_UPLOADED,
                    title: `Document uploaded to deal ${deal.dealNumber}`,
                    message: file.originalname,
                    entityType: NotificationEntityType.DEAL,
                    entityId: dto.ownerId,
                });
            }
        }

        return document;
    }

    async getFileForDownload(user: AuthUser, id: string) {
        const document = await this.findOne(user, id);
        const stream = await this.storage.getStream(document.path);
        return { document, stream };
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        await this.prisma.document.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return { success: true };
    }

    private async ensureOwnerExists(ownerType: DocumentOwnerType, ownerId: string, companyId: string) {
        const exists = await (() => {
            switch (ownerType) {
                case DocumentOwnerType.LEAD:
                    return this.prisma.lead.findFirst({ where: { id: ownerId, companyId } });
                case DocumentOwnerType.CLIENT:
                    return this.prisma.client.findFirst({ where: { id: ownerId, companyId } });
                case DocumentOwnerType.DEAL:
                    return this.prisma.deal.findFirst({ where: { id: ownerId, companyId } });
                case DocumentOwnerType.PROJECT:
                    return this.prisma.project.findFirst({ where: { id: ownerId, companyId } });
                case DocumentOwnerType.UNIT:
                    return this.prisma.unit.findFirst({ where: { id: ownerId, project: { companyId } } });
            }
        })();

        if (!exists) {
            throw new BadRequestException("Owner entity was not found in your company.");
        }
    }
}
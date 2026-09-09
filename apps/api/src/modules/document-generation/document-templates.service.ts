import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { DocumentType } from '@/generated/prisma/client';
import { AuthUser } from '@/common/types/auth-user.type';

import { UpsertDocumentTemplateDto } from './dto/upsert-document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    if (!user.companyId) {
      throw new ForbiddenException('User does not belong to a company');
    }

    return this.prisma.documentTemplate.findMany({
      where: { companyId: user.companyId, isActive: true, deletedAt: null },
      orderBy: { type: 'asc' },
    });
  }

  async findByType(user: AuthUser, type: DocumentType) {
    if (!user.companyId) {
      throw new ForbiddenException('User does not belong to a company');
    }

    return this.prisma.documentTemplate.findFirst({
      where: {
        companyId: user.companyId,
        type,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  /**
   * Only one template may be active per (companyId, type) — the previous
   * active row for the same type is deactivated in the same transaction
   * rather than overwritten, so a Document already generated from it keeps
   * a resolvable generatedFromTemplateId.
   */
  async upsert(user: AuthUser, dto: UpsertDocumentTemplateDto) {
    if (!user.companyId) {
      throw new ForbiddenException('User does not belong to a company');
    }

    const companyId = user.companyId;

    return this.prisma.$transaction(async (db) => {
      const previous = await db.documentTemplate.findFirst({
        where: { companyId, type: dto.type, isActive: true, deletedAt: null },
      });

      if (previous) {
        await db.documentTemplate.update({
          where: { id: previous.id },
          data: { isActive: false },
        });
      }

      return db.documentTemplate.create({
        data: {
          companyId,
          type: dto.type,
          name: dto.name,
          bodyHtml: dto.bodyHtml,
          version: (previous?.version ?? 0) + 1,
          createdById: user.id,
        },
      });
    });
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as Handlebars from 'handlebars';

import { PrismaService } from '@/database/prisma.service';
import {
  ActivityAction,
  ActivityType,
  DocumentType,
} from '@/generated/prisma/client';
import { AuthUser } from '@/common/types/auth-user.type';

import { UpsertDocumentTemplateDto } from './dto/upsert-document-template.dto';
import { activityText } from '@/modules/activities/activity-templates';
import { defaultTemplate } from './templates/default-templates';
import { documentLanguage } from './document-language';
import { DOCUMENT_FONT_FAMILY, documentFontCss } from './document-fonts';
import { TEMPLATABLE_DOCUMENT_TYPES } from './document-generation.constants';
import {
  sampleTemplateContext,
  templatePlaceholders,
} from './template-samples';

/** Compiles the way generation does (strict), so an unknown placeholder fails here. */
function renderTemplate(bodyHtml: string, context: object): string {
  return Handlebars.compile(bodyHtml, { strict: true, noEscape: false })(
    context,
  );
}

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

    // CA-5: refuse what would fail at generation time.
    await this.renderSample(companyId, dto.bodyHtml);

    const created = await this.prisma.$transaction(async (db) => {
      const previous = await db.documentTemplate.findFirst({
        where: { companyId, type: dto.type, isActive: true, deletedAt: null },
      });

      const latest = await db.documentTemplate.findFirst({
        where: { companyId, type: dto.type },
        orderBy: { version: 'desc' },
        select: { version: true },
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
          // Numbered after the newest version, not the active one: after a
          // reset to the default nothing is active, and the next save must
          // not reuse version 1.
          version: (latest?.version ?? 0) + 1,
          createdById: user.id,
        },
      });
    });

    await this.prisma.activity.create({
      data: {
        companyId,
        userId: user.id,
        action: ActivityAction.UPDATED_DOCUMENT_TEMPLATE,
        type: ActivityType.DOCUMENT_TEMPLATE_UPDATED,
        ...activityText('documentTemplateUpdated', { name: created.name }),
        metadata: {
          documentTemplateId: created.id,
          documentType: created.type,
          version: created.version,
        },
      },
    });

    return created;
  }

  /**
   * CA-5: everything the template editor shows for one type: the company's
   * active template (null while the built-in default is in use), the
   * default itself to start from, the placeholders it can use, and earlier
   * versions to go back to.
   */
  async editor(user: AuthUser, type: DocumentType) {
    const companyId = this.companyIdOf(user);
    this.assertTemplatable(type);

    const [company, versions] = await Promise.all([
      this.companyDetails(companyId),
      this.prisma.documentTemplate.findMany({
        where: { companyId, type, deletedAt: null },
        orderBy: { version: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          version: true,
          isActive: true,
          bodyHtml: true,
          createdAt: true,
          createdBy: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      type,
      current: versions.find((v) => v.isActive) ?? null,
      // E2E-3: the built-in in the company's document language.
      defaultHtml: defaultTemplate(type, documentLanguage(company.locale)) ?? '',
      placeholders: templatePlaceholders(type, sampleTemplateContext(company)),
      // The font the PDF is printed in, for the editor and preview frames.
      font: { family: DOCUMENT_FONT_FAMILY, css: documentFontCss() },
      versions,
    };
  }

  /** CA-5: the template filled with sample data, for the editor's preview. */
  async preview(user: AuthUser, type: DocumentType, bodyHtml: string) {
    this.assertTemplatable(type);
    return { html: await this.renderSample(this.companyIdOf(user), bodyHtml) };
  }

  /** CA-5: back to the built-in default; earlier versions stay in the history. */
  async resetToDefault(user: AuthUser, type: DocumentType) {
    const companyId = this.companyIdOf(user);
    this.assertTemplatable(type);

    const active = await this.prisma.documentTemplate.findFirst({
      where: { companyId, type, isActive: true, deletedAt: null },
    });
    if (!active) return { reset: false };

    await this.prisma.documentTemplate.update({
      where: { id: active.id },
      data: { isActive: false },
    });
    await this.prisma.activity.create({
      data: {
        companyId,
        userId: user.id,
        action: ActivityAction.UPDATED_DOCUMENT_TEMPLATE,
        type: ActivityType.DOCUMENT_TEMPLATE_UPDATED,
        ...activityText('documentTemplateReset', { name: active.name }),
        metadata: {
          documentTemplateId: active.id,
          documentType: type,
          version: active.version,
        },
      },
    });
    return { reset: true };
  }

  private async renderSample(companyId: string, bodyHtml: string) {
    const context = sampleTemplateContext(await this.companyDetails(companyId));
    try {
      return renderTemplate(bodyHtml, context);
    } catch (error) {
      // Handlebars' strict-mode message names the lookup target as
      // "[object Object]", which tells an admin nothing.
      const reason = (
        error instanceof Error ? error.message : String(error)
      ).replace(/ in (\[object Object\]|undefined)/, '');
      throw new BadRequestException(
        `The template can't be filled in: ${reason}`,
      );
    }
  }

  private companyDetails(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        name: true,
        legalName: true,
        address: true,
        phone: true,
        taxId: true,
        signatoryName: true,
        signatoryTitle: true,
        currency: true,
        locale: true,
      },
    });
  }

  private companyIdOf(user: AuthUser): string {
    if (!user.companyId) {
      throw new ForbiddenException('User does not belong to a company');
    }
    return user.companyId;
  }

  private assertTemplatable(type: DocumentType) {
    if (!TEMPLATABLE_DOCUMENT_TYPES.includes(type)) {
      throw new BadRequestException(
        `No template is used for ${type} documents`,
      );
    }
  }
}

import { randomUUID } from 'crypto';
import * as Handlebars from 'handlebars';
import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { DocumentOwnerType, DocumentType } from '@/generated/prisma/client';
import { DEAL_DETAILS_INCLUDE } from '@/modules/deals/deal.constants';
import {
  FILE_STORAGE_PROVIDER,
  FileStorageProvider,
} from '@/modules/documents/storage/file-storage.interface';

import { DEFAULT_TEMPLATES } from './templates/default-templates';
import { buildTemplateContext } from './template-context.builder';
import { renderHtmlToPdf } from './pdf-renderer';
import {
  TemplateRenderFailedException,
  UnsupportedDocumentTypeException,
} from './exceptions';

interface GenerateForDealParams {
  companyId: string;
  dealId: string;
  type: DocumentType;
  userId: string;
}

@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_PROVIDER) private readonly storage: FileStorageProvider,
  ) {}

  /**
   * Renders a document for a deal and persists it as an ordinary Document
   * row (ownerType DEAL). Uses the company's active template for `type` if
   * one exists, otherwise the built-in default — see default-templates.ts.
   *
   * Deliberately outside any DB transaction: writing the PDF to disk isn't
   * transactional, and rendering is slow enough (browser launch + page
   * render) that it shouldn't extend a deal-mutating transaction's lock
   * window. Callers (DealsService) run this after their own transaction has
   * already committed, and treat a failure here as non-fatal to the deal
   * action that triggered it.
   */
  async generateForDeal(params: GenerateForDealParams) {
    const { companyId, dealId, type, userId } = params;

    const [deal, company] = await Promise.all([
      this.prisma.deal.findUniqueOrThrow({
        where: { id: dealId },
        include: DEAL_DETAILS_INCLUDE,
      }),
      this.prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    ]);

    const template = await this.prisma.documentTemplate.findFirst({
      where: { companyId, type, isActive: true, deletedAt: null },
      orderBy: { version: 'desc' },
    });

    const bodyHtml = template?.bodyHtml ?? DEFAULT_TEMPLATES[type];
    if (!bodyHtml) {
      throw new UnsupportedDocumentTypeException(type);
    }

    const context = buildTemplateContext(deal, company);

    let html: string;
    try {
      const compile = Handlebars.compile(bodyHtml, {
        strict: true,
        noEscape: false,
      });
      html = compile(context);
    } catch (error) {
      throw new TemplateRenderFailedException(
        type,
        error instanceof Error ? error.message : String(error),
      );
    }

    const pdfBuffer = await renderHtmlToPdf(html);

    const storedName = `${randomUUID()}.pdf`;
    const relativePath = await this.storage.save(companyId, storedName, pdfBuffer);
    const originalName = `${type.toLowerCase()}-${deal.dealNumber}.pdf`;

    return this.prisma.document.create({
      data: {
        name: storedName,
        originalName,
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: pdfBuffer.length,
        path: relativePath,
        type,
        ownerType: DocumentOwnerType.DEAL,
        ownerId: dealId,
        companyId,
        uploadedById: userId,
        generatedFromTemplateId: template?.id,
      },
    });
  }
}

import { IsIn, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '@/generated/prisma/client';
import { TEMPLATABLE_DOCUMENT_TYPES } from '../document-generation.constants';

export class PreviewDocumentTemplateDto {
  @IsIn(TEMPLATABLE_DOCUMENT_TYPES)
  type: DocumentType;

  @IsString()
  @MaxLength(200_000)
  bodyHtml: string;
}

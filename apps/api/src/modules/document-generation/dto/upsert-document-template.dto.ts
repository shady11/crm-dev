import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '@/generated/prisma/client';
import { GENERATABLE_DOCUMENT_TYPES } from '../document-generation.constants';

export class UpsertDocumentTemplateDto {
  @IsIn(GENERATABLE_DOCUMENT_TYPES)
  type: DocumentType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(20)
  bodyHtml: string;
}

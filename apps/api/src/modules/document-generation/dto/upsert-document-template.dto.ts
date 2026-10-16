import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '@/generated/prisma/client';
import { TEMPLATABLE_DOCUMENT_TYPES } from '../document-generation.constants';

export class UpsertDocumentTemplateDto {
  @IsIn(TEMPLATABLE_DOCUMENT_TYPES)
  type: DocumentType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(20)
  @MaxLength(200_000)
  bodyHtml: string;
}

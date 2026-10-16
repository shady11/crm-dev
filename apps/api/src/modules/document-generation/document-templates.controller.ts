import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CompanyGuard } from '@/common/guards/company.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '@/common/types/auth-user.type';
import { DocumentType } from '@/generated/prisma/client';

import { DocumentTemplatesService } from './document-templates.service';
import { UpsertDocumentTemplateDto } from './dto/upsert-document-template.dto';
import { PreviewDocumentTemplateDto } from './dto/preview-document-template.dto';

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@RequirePermissions('documents.manage_templates')
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly templatesService: DocumentTemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.templatesService.findAll(user);
  }

  // CA-5: the editor page's data for one type. Declared before ':type' so
  // "editor" isn't read as a document type.
  @Get('editor/:type')
  editor(
    @CurrentUser() user: AuthUser,
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
  ) {
    return this.templatesService.editor(user, type);
  }

  @Post('preview')
  preview(
    @CurrentUser() user: AuthUser,
    @Body() dto: PreviewDocumentTemplateDto,
  ) {
    return this.templatesService.preview(user, dto.type, dto.bodyHtml);
  }

  @Post(':type/reset')
  reset(
    @CurrentUser() user: AuthUser,
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
  ) {
    return this.templatesService.resetToDefault(user, type);
  }

  @Get(':type')
  findByType(
    @CurrentUser() user: AuthUser,
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
  ) {
    return this.templatesService.findByType(user, type);
  }

  @Put()
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertDocumentTemplateDto,
  ) {
    return this.templatesService.upsert(user, dto);
  }
}

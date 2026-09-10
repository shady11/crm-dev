import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CompanyGuard } from '@/common/guards/company.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '@/common/types/auth-user.type';
import { UserRole } from '@/generated/prisma/enums';
import { DocumentType } from '@/generated/prisma/client';

import { DocumentTemplatesService } from './document-templates.service';
import { UpsertDocumentTemplateDto } from './dto/upsert-document-template.dto';

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly templatesService: DocumentTemplatesService) {}

  @Roles(UserRole.COMPANY_ADMIN)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.templatesService.findAll(user);
  }

  @Roles(UserRole.COMPANY_ADMIN)
  @Get(':type')
  findByType(
    @CurrentUser() user: AuthUser,
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
  ) {
    return this.templatesService.findByType(user, type);
  }

  @Roles(UserRole.COMPANY_ADMIN)
  @Put()
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertDocumentTemplateDto,
  ) {
    return this.templatesService.upsert(user, dto);
  }
}

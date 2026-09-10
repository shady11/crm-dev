import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';

import { DocumentGenerationService } from './document-generation.service';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentTemplatesController],
  providers: [DocumentGenerationService, DocumentTemplatesService],
  exports: [DocumentGenerationService, DocumentTemplatesService],
})
export class DocumentGenerationModule {}

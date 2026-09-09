import { BadRequestException } from '@nestjs/common';

export class TemplateRenderFailedException extends BadRequestException {
  constructor(documentType: string, reason: string) {
    super(`Failed to render ${documentType} template: ${reason}`);
  }
}

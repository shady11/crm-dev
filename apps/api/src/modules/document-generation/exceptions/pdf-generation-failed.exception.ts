import { InternalServerErrorException } from '@nestjs/common';

export class PdfGenerationFailedException extends InternalServerErrorException {
  constructor(reason: string) {
    super(`Failed to render document to PDF: ${reason}`);
  }
}

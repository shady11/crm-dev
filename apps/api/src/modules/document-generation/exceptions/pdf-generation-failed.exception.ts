import { InternalServerErrorException } from '@nestjs/common';

/**
 * The browser's own error (binary paths, launch flags) is for the server
 * log, not the person who clicked "Generate": it goes in `cause`, which
 * renderHtmlToPdf logs, and the response says only what happened.
 */
export class PdfGenerationFailedException extends InternalServerErrorException {
  constructor(reason: string) {
    super('The document could not be turned into a PDF. Please try again later.', {
      cause: reason,
    });
  }
}

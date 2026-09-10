import { BadRequestException } from '@nestjs/common';

export class UnsupportedDocumentTypeException extends BadRequestException {
  constructor(type: string) {
    super(
      `"${type}" cannot be generated — no active template and no built-in default exists for it.`,
    );
  }
}

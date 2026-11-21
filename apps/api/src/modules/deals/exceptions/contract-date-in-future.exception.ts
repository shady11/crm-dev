import { BadRequestException } from '@nestjs/common';

export class ContractDateInFutureException extends BadRequestException {
  constructor() {
    super("Contract date can't be in the future.");
  }
}

import { BadRequestException } from '@nestjs/common';

export class DiscountNotPendingException extends BadRequestException {
  constructor() {
    super('This deal has no discount request awaiting a decision.');
  }
}

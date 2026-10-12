import { BadRequestException } from '@nestjs/common';

export class PaymentDateInFutureException extends BadRequestException {
  constructor() {
    super("Payment date can't be in the future.");
  }
}

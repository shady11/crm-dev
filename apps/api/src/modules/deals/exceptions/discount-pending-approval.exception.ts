import { ConflictException } from '@nestjs/common';

export class DiscountPendingApprovalException extends ConflictException {
  constructor() {
    super(
      'This deal has a discount awaiting approval — it cannot be signed until that is decided.',
    );
  }
}

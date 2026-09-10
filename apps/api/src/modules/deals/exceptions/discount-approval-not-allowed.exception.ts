import { ForbiddenException } from '@nestjs/common';

export class DiscountApprovalNotAllowedException extends ForbiddenException {
  constructor() {
    super(
      'The requested discount is above your approval limit — this needs a higher-level approver.',
    );
  }
}

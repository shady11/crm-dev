import { UnprocessableEntityException } from '@nestjs/common';

export type ContractClientField = 'passport' | 'pin';

const FIELD_LABELS: Record<ContractClientField, string> = {
  passport: 'passport number',
  pin: 'personal number (PIN)',
};

/**
 * A sale contract names the buyer by their ID document, so it can't be
 * signed for a client whose card lacks it. `missing` lets the UI point at
 * the exact fields to fill in.
 */
export class ClientDetailsMissingException extends UnprocessableEntityException {
  constructor(missing: ContractClientField[]) {
    super({
      message: `Add the client's ${missing.map((f) => FIELD_LABELS[f]).join(' and ')} before signing the contract.`,
      missing,
    });
  }
}

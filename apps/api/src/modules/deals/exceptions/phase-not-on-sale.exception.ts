import {ConflictException} from '@nestjs/common';

export class PhaseNotOnSaleException extends ConflictException {
    constructor(blockName: string, phaseName: string) {
        super(`Block "${blockName}" is in phase "${phaseName}", which is not on sale yet.`);
    }
}

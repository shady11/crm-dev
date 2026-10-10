import {ConflictException} from '@nestjs/common';

export class BlockNotOnSaleException extends ConflictException {
    constructor(blockName: string) {
        super(`Block "${blockName}" is not on sale yet.`);
    }
}

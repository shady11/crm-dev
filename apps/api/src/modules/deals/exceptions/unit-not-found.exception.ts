import {NotFoundException} from '@nestjs/common';

export class UnitNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Unit "${id}" was not found.`);
    }
}
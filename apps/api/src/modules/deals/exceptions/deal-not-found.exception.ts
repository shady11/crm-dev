import {NotFoundException} from '@nestjs/common';

export class DealNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Deal "${id}" was not found.`);
    }
}
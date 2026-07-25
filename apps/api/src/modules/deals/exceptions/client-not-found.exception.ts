import {NotFoundException} from '@nestjs/common';

export class ClientNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Client "${id}" was not found.`);
    }
}
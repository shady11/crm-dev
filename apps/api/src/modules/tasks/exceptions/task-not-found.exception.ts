import {NotFoundException} from '@nestjs/common';

export class TaskNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Task ${id} was not found.`);
    }
}
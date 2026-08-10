import {NotFoundException} from "@nestjs/common";

export class DocumentNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Document ${id} was not found.`);
    }
}
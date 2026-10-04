import {ConflictException} from '@nestjs/common';

export class ProjectNotOpenForSalesException extends ConflictException {
    constructor(projectName: string, status: string) {
        super(`Project "${projectName}" is ${status} and not open for sales.`);
    }
}

import {IsUUID} from "class-validator";

export class HandOverDto {
    // Who takes the work over: an active member of the same branch's sales
    // team (the Sales Head included), the same rule as a single reassignment.
    @IsUUID()
    managerId!: string;
}

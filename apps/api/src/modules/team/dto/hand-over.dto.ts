import {IsUUID} from "class-validator";

export class HandOverDto {
    // Who takes the work over: an active individual contributor on the
    // same branch, the same rule as a single reassignment.
    @IsUUID()
    managerId!: string;
}

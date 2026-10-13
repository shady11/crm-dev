import {ArrayMaxSize, ArrayMinSize, IsArray, IsUUID} from "class-validator";

export class BulkReassignLeadsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(500)
    @IsUUID("all", {each: true})
    leadIds!: string[];

    @IsUUID()
    managerId!: string;
}

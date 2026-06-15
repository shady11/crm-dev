import { IsEnum } from "class-validator";
import { UnitStatus } from "@/generated/prisma/enums";

export class UpdateUnitStatusDto {
    @IsEnum(UnitStatus)
    status!: UnitStatus;
}
import {IsEnum} from "class-validator";
import {TaskStatus} from "@/generated/prisma/client";

export class UpdateTaskStatusDto {
    @IsEnum(TaskStatus)
    status!: TaskStatus;
}
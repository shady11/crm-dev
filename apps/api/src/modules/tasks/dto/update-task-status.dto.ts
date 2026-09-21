import {IsEnum, IsOptional, IsString, MaxLength} from "class-validator";
import {TaskStatus} from "@/generated/prisma/client";

export class UpdateTaskStatusDto {
    @IsEnum(TaskStatus)
    status!: TaskStatus;

    // Required whenever this transition closes the task (status moving to
    // DONE/CANCELLED) — see TasksService.ensureOutcomeOnClose.
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    outcome?: string;
}

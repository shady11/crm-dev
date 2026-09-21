import {PartialType} from "@nestjs/mapped-types";
import {IsOptional, IsString, MaxLength} from "class-validator";
import {CreateTaskDto} from "./create-task.dto";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    // Required by TasksService.update whenever this write closes the task
    // (status moving to DONE/CANCELLED) — see ensureOutcomeOnClose.
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    outcome?: string;
}

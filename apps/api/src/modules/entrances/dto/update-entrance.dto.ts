import { PartialType } from "@nestjs/mapped-types";
import { CreateEntranceDto } from "./create-entrance.dto";

export class UpdateEntranceDto extends PartialType(CreateEntranceDto) {}
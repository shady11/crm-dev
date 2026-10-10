import {IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {DocumentOwnerType, DocumentType} from "@/generated/prisma/client";

export class QueryDocumentsDto {
    @IsOptional()
    @IsEnum(DocumentOwnerType)
    ownerType?: DocumentOwnerType;

    @IsOptional()
    @IsUUID()
    ownerId?: string;

    // A client's own documents plus those on each of their deals. Takes the
    // place of ownerType/ownerId when set.
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @IsOptional()
    @IsEnum(DocumentType)
    type?: DocumentType;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
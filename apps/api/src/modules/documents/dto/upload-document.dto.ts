import {IsEnum, IsOptional, IsUUID} from "class-validator";
import {DocumentOwnerType, DocumentType} from "@/generated/prisma/client";

export class UploadDocumentDto {
    @IsEnum(DocumentOwnerType)
    ownerType!: DocumentOwnerType;

    @IsUUID()
    ownerId!: string;

    @IsOptional()
    @IsEnum(DocumentType)
    type?: DocumentType;
}
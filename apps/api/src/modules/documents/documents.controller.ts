import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {FileInterceptor} from "@nestjs/platform-express";
import type {Response} from "express";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {DocumentsService} from "./documents.service";
import {UploadDocumentDto} from "./dto/upload-document.dto";
import {QueryDocumentsDto} from "./dto/query-documents.dto";
import {documentMulterOptions} from "./documents.constants";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @RequirePermissions("documents.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryDocumentsDto) {
        return this.documentsService.findAll(user, query);
    }

    @RequirePermissions("documents.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.documentsService.findOne(user, id);
    }

    @RequirePermissions("documents.view")
    @Get(":id/download")
    async download(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { document, stream } = await this.documentsService.getFileForDownload(user, id);

        res.set({
            "Content-Type": document.mimeType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(document.originalName)}"`,
        });

        return new StreamableFile(stream);
    }

    @RequirePermissions("documents.upload")
    @Post()
    @UseInterceptors(FileInterceptor("file", documentMulterOptions))
    upload(
        @CurrentUser() user: AuthUser,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadDocumentDto,
    ) {
        return this.documentsService.upload(user, file, dto);
    }

    @RequirePermissions("documents.delete")
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.documentsService.remove(user, id);
    }
}

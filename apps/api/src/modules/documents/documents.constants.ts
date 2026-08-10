import {mkdir, writeFile} from "fs/promises";
import {join} from "path";
import {BadRequestException} from "@nestjs/common";
import {memoryStorage} from "multer";
import type {MulterOptions} from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

export const UPLOADS_ROOT = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads", "documents");

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const documentMulterOptions: MulterOptions = {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return callback(new BadRequestException("Unsupported file type."), false);
        }
        callback(null, true);
    },
};

export async function saveFileToDisk(companyId: string, storedName: string, buffer: Buffer): Promise<string> {
    const dir = join(UPLOADS_ROOT, companyId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, storedName), buffer);
    return join(companyId, storedName);
}
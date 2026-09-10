import {BadRequestException} from "@nestjs/common";
import {memoryStorage} from "multer";
import type {MulterOptions} from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

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

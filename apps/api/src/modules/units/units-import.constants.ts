import {BadRequestException} from "@nestjs/common";
import {memoryStorage} from "multer";
import type {MulterOptions} from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — a 200-unit shakhmatka is a few hundred KB.

const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];

// CSV mimetypes are inconsistent across browsers/OS (text/csv,
// application/vnd.ms-excel, application/csv, sometimes text/plain), so the
// filename extension is the only reliable check here — unlike
// documentMulterOptions, which can rely on a fixed, well-known mimetype list.
export const unitsImportMulterOptions: MulterOptions = {
    storage: memoryStorage(),
    limits: {fileSize: MAX_FILE_SIZE},
    fileFilter: (_req, file, callback) => {
        const name = file.originalname.toLowerCase();
        if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
            return callback(new BadRequestException("Only .csv or .xlsx files are supported."), false);
        }
        callback(null, true);
    },
};

// Header aliases, matched case-insensitively/trimmed. Real-world spreadsheet
// exports spell these inconsistently, so each canonical field accepts a
// couple of common variants.
export const UNIT_IMPORT_COLUMN_ALIASES: Record<string, string[]> = {
    block: ["block"],
    entrance: ["entrance"],
    floor: ["floor"],
    number: ["number", "unit", "unit_number", "unitnumber"],
    area: ["area"],
    price: ["price", "base_price", "baseprice"],
    type: ["type"],
    rooms: ["rooms"],
};

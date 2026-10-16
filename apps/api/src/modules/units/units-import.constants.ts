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

// Header aliases, matched after normalizeHeader(). Real-world spreadsheet
// exports spell these inconsistently, and a sales department's own
// shakhmatka is usually in Russian or Kyrgyz (CA-7), so each field accepts
// the common variants in all three languages.
export const UNIT_IMPORT_COLUMN_ALIASES = {
    block: ["block", "блок", "корпус"],
    entrance: ["entrance", "section", "подъезд", "секция", "кире бериш"],
    floor: ["floor", "этаж", "кабат"],
    number: ["number", "unit", "unit_number", "unitnumber", "unit number", "№", "номер", "номер квартиры", "№ квартиры", "квартира", "помещение", "бөлмө номери", "үй номери"],
    area: ["area", "площадь", "общая площадь", "аянт", "аянты"],
    price: ["price", "base_price", "baseprice", "base price", "цена", "стоимость", "баа", "баасы"],
    type: ["type", "тип", "түрү", "түр"],
    rooms: ["rooms", "комнаты", "комнат", "кол-во комнат", "количество комнат", "бөлмөлөр", "бөлмө саны"],
} satisfies Record<string, string[]>;

export type UnitImportField = keyof typeof UNIT_IMPORT_COLUMN_ALIASES;

/** Columns a row can't do without; type and rooms are optional. */
export const REQUIRED_IMPORT_FIELDS: UnitImportField[] = ["block", "entrance", "floor", "number", "area", "price"];

/** The headers the sample file uses, per language. */
export const SAMPLE_HEADERS: Record<"en" | "ru" | "ky", Record<UnitImportField, string>> = {
    en: {block: "Block", entrance: "Entrance", floor: "Floor", number: "Number", area: "Area", price: "Price", type: "Type", rooms: "Rooms"},
    ru: {block: "Блок", entrance: "Подъезд", floor: "Этаж", number: "Номер", area: "Площадь", price: "Цена", type: "Тип", rooms: "Комнаты"},
    ky: {block: "Блок", entrance: "Кире бериш", floor: "Кабат", number: "Номер", area: "Аянт", price: "Баа", type: "Түрү", rooms: "Бөлмөлөр"},
};

/** Unit type names a file may use instead of the codes. */
export const UNIT_TYPE_ALIASES: Record<string, string> = {
    apartment: "APARTMENT", flat: "APARTMENT", "квартира": "APARTMENT", "батир": "APARTMENT", "квартира-студия": "APARTMENT", "студия": "APARTMENT",
    commercial: "COMMERCIAL", "коммерческое": "COMMERCIAL", "коммерция": "COMMERCIAL", "коммерческое помещение": "COMMERCIAL", "коммерциялык": "COMMERCIAL",
    parking: "PARKING", "парковка": "PARKING", "паркинг": "PARKING", "машиноместо": "PARKING", "унаа токтоочу жай": "PARKING",
    storage: "STORAGE", "кладовая": "STORAGE", "кладовка": "STORAGE", "кампа": "STORAGE",
};

/**
 * "Площадь, м²", " ЦЕНА (сом) " and "Номер квартиры*" all name a known
 * column; units, notes and required-field stars are dropped before matching.
 */
export function normalizeHeader(header: string): string {
    const trimmed = header.trim().toLowerCase().replace(/ё/g, "е");
    if (trimmed === "№" || trimmed === "#") return "№";
    return trimmed
        .replace(/\(.*?\)/g, " ")
        .replace(/,.*$/, " ")
        .replace(/[*:.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

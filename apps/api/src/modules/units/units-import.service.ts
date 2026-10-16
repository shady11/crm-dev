import {BadRequestException, ForbiddenException, Injectable} from "@nestjs/common";
import * as XLSX from "xlsx";
import {ActivityAction, ActivityType, UnitStatus, UnitType} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {hasPermission} from "@/common/utils/permissions.util";
import {
    normalizeHeader,
    REQUIRED_IMPORT_FIELDS,
    SAMPLE_HEADERS,
    UNIT_IMPORT_COLUMN_ALIASES,
    UNIT_TYPE_ALIASES,
    type UnitImportField,
} from "./units-import.constants";
import {ImportRowErrorCode, ImportUnitRowError, ImportUnitsResult} from "./dto/import-units-result.dto";
import {activityText} from "@/modules/activities/activity-templates";
import {UnitPriceRequestsService} from "./unit-price-requests.service";

type ParsedUnitRow = {
    block: string;
    entrance: string;
    floor: number;
    number: string;
    area: number;
    price: number;
    type?: UnitType;
    rooms?: number;
};

type RowProblem = {code: ImportRowErrorCode; message: string; params?: Record<string, string | number>};

/** Distinguishes an expected, row-reportable problem from an unexpected DB error. */
class RowImportError extends Error {
    constructor(readonly problem: RowProblem) {
        super(problem.message);
    }
}

/** A unit the project already has, as the import needs it. */
type ExistingUnit = {id: string; number: string; price: number; status: UnitStatus; createdAtRow?: number};

const UNIT_TYPE_VALUES = Object.values(UnitType);

@Injectable()
export class UnitsImportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly priceRequests: UnitPriceRequestsService,
    ) {}

    /**
     * Bulk-creates units for a project from an uploaded CSV/XLSX (CA-C1).
     *
     * CA-7: a row for a unit the project already has (same block and
     * number) is a price update, not a duplicate. Only an AVAILABLE unit
     * takes the new price, through the same SH-2 rules as editing it by hand
     * (applied for someone who approves prices, otherwise sent for
     * approval); a reserved, sold or withdrawn unit keeps its price, since a
     * deal or a decision already depends on it, and is reported back.
     * Rows are processed one at a time, sequentially — never in parallel. The
     * find-or-create caches for Block/Entrance/Floor below are not
     * concurrency-safe (two rows racing to create "Block A" would otherwise
     * create it twice), and sequential processing is what makes each row's
     * success or failure independent of every other row: a single bad row is
     * recorded and skipped, the other 199 are unaffected.
     */
    async importFromFile(user: AuthUser, projectId: string, file: Express.Multer.File): Promise<ImportUnitsResult> {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (!file) {
            throw new BadRequestException("No file uploaded");
        }

        const project = await this.ensureProjectBelongsToCompany(projectId, user.companyId);

        const rawRows = this.parseWorkbook(file.buffer);
        const cache = await this.seedHierarchyCache(projectId);
        const canEditPrice = hasPermission(user, "units.edit_price");

        const result: ImportUnitsResult = {
            created: 0, pricesUpdated: 0, pricesRequested: 0, unchanged: 0, keptPrices: [], failed: 0, errors: [],
        };
        const rowError = (row: number, problems: RowProblem[]): ImportUnitRowError => ({
            row,
            messages: problems.map((p) => p.message),
            codes: problems.map(({code, params}) => (params ? {code, params} : {code})),
        });

        for (let index = 0; index < rawRows.length; index++) {
            // Row 1 is the header, so the first data row is row 2.
            const rowNumber = index + 2;
            const {row, problems} = this.parseRow(rawRows[index]);

            if (!row) {
                result.errors.push(rowError(rowNumber, problems));
                continue;
            }

            const existing = this.findExisting(cache, row);
            if (existing?.createdAtRow) {
                result.errors.push(rowError(rowNumber, [{
                    code: "duplicateInFile",
                    message: `Unit ${row.number} in block ${row.block} is already on row ${existing.createdAtRow} of this file`,
                    params: {number: row.number, block: row.block, row: existing.createdAtRow},
                }]));
                continue;
            }

            if (existing) {
                if (existing.price === row.price) {
                    result.unchanged++;
                } else if (existing.status !== UnitStatus.AVAILABLE) {
                    result.keptPrices.push({
                        row: rowNumber, block: row.block, number: row.number, status: existing.status,
                        currentPrice: existing.price, filePrice: row.price,
                    });
                } else if (!canEditPrice) {
                    result.errors.push(rowError(rowNumber, [{
                        code: "priceNotAllowed",
                        message: `Unit ${row.number} already exists; changing its price needs the units.edit_price permission`,
                        params: {number: row.number},
                    }]));
                } else {
                    try {
                        const outcome = await this.priceRequests.handlePriceChange(
                            user,
                            {id: existing.id, number: existing.number, price: existing.price, project: {name: project.name}},
                            row.price,
                            {notify: false},
                        );
                        if (outcome.outcome === "apply") {
                            await this.prisma.unit.update({where: {id: existing.id}, data: {price: row.price}});
                            existing.price = row.price;
                            result.pricesUpdated++;
                        } else {
                            result.pricesRequested++;
                        }
                    } catch {
                        result.errors.push(rowError(rowNumber, [{
                            code: "rowFailed",
                            message: "Could not update this unit's price. Please check the row and try again.",
                        }]));
                    }
                }
                continue;
            }

            try {
                await this.createRow(projectId, row, cache, rowNumber);
                result.created++;
            } catch (error) {
                result.errors.push(rowError(rowNumber, [
                    error instanceof RowImportError
                        ? error.problem
                        : {code: "rowFailed", message: "Could not create this unit. Please check the row and try again."},
                ]));
            }
        }

        result.failed = result.errors.length;
        const priceChanges = result.pricesUpdated + result.pricesRequested;

        if (result.created > 0 || priceChanges > 0) {
            await this.prisma.activity.create({
                data: {
                    companyId: user.companyId,
                    userId: user.id,
                    action: ActivityAction.IMPORTED_UNITS,
                    type: ActivityType.UNITS_IMPORTED,
                    ...(priceChanges > 0
                        ? activityText("unitsImportedWithPrices", {
                            units: result.created, prices: result.pricesUpdated, requested: result.pricesRequested,
                        })
                        : activityText("unitsImported", {count: result.created})),
                    metadata: {
                        projectId, created: result.created, failed: result.failed,
                        pricesUpdated: result.pricesUpdated, pricesRequested: result.pricesRequested,
                        keptPrices: result.keptPrices.length,
                    },
                },
            });
        }

        // One notice for the whole file instead of one per unit.
        if (priceChanges > 0) {
            await this.priceRequests.notifyImportedPrices(user, {
                projectId, project: project.name, updated: result.pricesUpdated, requested: result.pricesRequested,
            });
        }

        return result;
    }

    /**
     * CA-7: the sample file, with headers in the reader's language (any of
     * the three is accepted back) and a few example rows.
     */
    buildSample(lang: string): Buffer {
        const language = lang === "ru" || lang === "ky" ? lang : "en";
        const headers = SAMPLE_HEADERS[language];
        // Type names in the same language; parseRow() accepts them back.
        const [apartment, commercial] = {
            en: ["Apartment", "Commercial"], ru: ["Квартира", "Коммерческое"], ky: ["Батир", "Коммерциялык"],
        }[language];
        const fields: UnitImportField[] = ["block", "entrance", "floor", "number", "area", "price", "type", "rooms"];
        const rows = [
            ["A", "1", 2, "201", 45.5, 5200000, apartment, 1],
            ["A", "1", 2, "202", 68, 7400000, apartment, 2],
            ["A", "1", 1, "101", 120, 15000000, commercial, ""],
        ];
        const sheet = XLSX.utils.aoa_to_sheet([fields.map((field) => headers[field]), ...rows]);
        sheet["!cols"] = fields.map(() => ({wch: 14}));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Units");
        return XLSX.write(workbook, {type: "buffer", bookType: "xlsx"}) as Buffer;
    }

    private findExisting(cache: HierarchyCache, row: ParsedUnitRow): ExistingUnit | undefined {
        const block = cache.blocks.get(row.block.toLowerCase());
        return block ? cache.existingUnits.get(`${block.id}::${row.number}`) : undefined;
    }

    /**
     * One row's writes — find-or-create Block, then Entrance, then Floor, then
     * the Unit itself — in a single short transaction scoped to this row only.
     * If the Unit insert fails after a fresh Block/Entrance/Floor was just
     * created for this row, this rolls back only that row's writes instead of
     * leaving an orphaned empty hierarchy chain behind. Earlier rows'
     * successes, already committed in their own transactions, are untouched.
     */
    private async createRow(projectId: string, row: ParsedUnitRow, cache: HierarchyCache, rowNumber: number) {
        await this.prisma.$transaction(async (tx) => {
            const blockKey = row.block.toLowerCase();
            let block = cache.blocks.get(blockKey);

            if (!block) {
                const order = cache.nextBlockOrder++;
                block = await tx.block.create({
                    data: {name: row.block, order, projectId},
                    select: {id: true},
                });
                cache.blocks.set(blockKey, block);
            }

            const entranceKey = `${block.id}::${row.entrance.toLowerCase()}`;
            let entrance = cache.entrances.get(entranceKey);

            if (!entrance) {
                const order = cache.nextEntranceOrder.get(block.id) ?? 1;
                entrance = await tx.entrance.create({
                    data: {name: row.entrance, order, projectId, blockId: block.id},
                    select: {id: true},
                });
                cache.nextEntranceOrder.set(block.id, order + 1);
                cache.entrances.set(entranceKey, entrance);
            }

            const floorKey = `${entrance.id}::${row.floor}`;
            let floor = cache.floors.get(floorKey);

            if (!floor) {
                const order = cache.nextFloorOrder.get(entrance.id) ?? 1;
                floor = await tx.floor.create({
                    data: {number: row.floor, order, projectId, blockId: block.id, entranceId: entrance.id},
                    select: {id: true},
                });
                cache.nextFloorOrder.set(entrance.id, order + 1);
                cache.floors.set(floorKey, floor);
            }

            const usedNumbers = cache.unitNumbersByBlock.get(block.id) ?? new Set<string>();

            if (usedNumbers.has(row.number)) {
                throw new RowImportError({
                    code: "rowFailed",
                    message: `Unit number "${row.number}" already exists in block "${row.block}"`,
                });
            }

            const created = await tx.unit.create({
                data: {
                    number: row.number,
                    type: row.type ?? UnitType.APARTMENT,
                    rooms: row.rooms,
                    area: row.area,
                    price: row.price,
                    projectId,
                    blockId: block.id,
                    entranceId: entrance.id,
                    floorId: floor.id,
                },
            });

            usedNumbers.add(row.number);
            cache.unitNumbersByBlock.set(block.id, usedNumbers);
            // A later row for the same unit is reported as a repeat.
            cache.existingUnits.set(`${block.id}::${row.number}`, {
                id: created.id, number: row.number, price: row.price, status: UnitStatus.AVAILABLE,
                createdAtRow: rowNumber,
            });
        });
    }

    /**
     * Seeds the find-or-create caches from what already exists in the project,
     * so a name shared between a pre-existing block/entrance/floor and a row in
     * this file resolves to the same one instead of creating a duplicate, and
     * so auto-assigned `order` values continue on from the existing sequence —
     * the same `(last?.order ?? 0) + 1` convention BlocksService/
     * EntrancesService/FloorsService each use in their own create().
     */
    private async seedHierarchyCache(projectId: string): Promise<HierarchyCache> {
        const [blocks, entrances, floors, units] = await Promise.all([
            this.prisma.block.findMany({where: {projectId}, select: {id: true, name: true, order: true}}),
            this.prisma.entrance.findMany({
                where: {projectId},
                select: {id: true, name: true, order: true, blockId: true},
            }),
            this.prisma.floor.findMany({
                where: {projectId},
                select: {id: true, number: true, order: true, entranceId: true},
            }),
            this.prisma.unit.findMany({
                where: {projectId},
                select: {id: true, number: true, blockId: true, price: true, status: true},
            }),
        ]);

        const cache: HierarchyCache = {
            blocks: new Map(blocks.map((block) => [block.name.trim().toLowerCase(), {id: block.id}])),
            entrances: new Map(
                entrances.map((entrance) => [
                    `${entrance.blockId}::${entrance.name.trim().toLowerCase()}`,
                    {id: entrance.id},
                ]),
            ),
            floors: new Map(floors.map((floor) => [`${floor.entranceId}::${floor.number}`, {id: floor.id}])),
            unitNumbersByBlock: new Map(),
            existingUnits: new Map(),
            nextBlockOrder: (blocks.reduce((max, block) => Math.max(max, block.order), 0) ?? 0) + 1,
            nextEntranceOrder: new Map(),
            nextFloorOrder: new Map(),
        };

        for (const entrance of entrances) {
            const current = cache.nextEntranceOrder.get(entrance.blockId) ?? 1;
            cache.nextEntranceOrder.set(entrance.blockId, Math.max(current, entrance.order + 1));
        }

        for (const floor of floors) {
            const current = cache.nextFloorOrder.get(floor.entranceId) ?? 1;
            cache.nextFloorOrder.set(floor.entranceId, Math.max(current, floor.order + 1));
        }

        for (const unit of units) {
            if (!cache.unitNumbersByBlock.has(unit.blockId)) {
                cache.unitNumbersByBlock.set(unit.blockId, new Set());
            }
            cache.unitNumbersByBlock.get(unit.blockId)!.add(unit.number);
            cache.existingUnits.set(`${unit.blockId}::${unit.number}`, {
                id: unit.id, number: unit.number, price: Number(unit.price), status: unit.status,
            });
        }

        return cache;
    }

    private parseWorkbook(buffer: Buffer): Record<string, unknown>[] {
        const workbook = this.readWorkbook(buffer);
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            return [];
        }

        const sheet = workbook.Sheets[sheetName];
        const headerRow = (XLSX.utils.sheet_to_json<unknown[]>(sheet, {header: 1, blankrows: false})[0] ?? [])
            .map((cell) => normalizeHeader(typeof cell === "string" || typeof cell === "number" ? String(cell) : ""))
            .filter(Boolean);
        this.assertColumnsRecognised(headerRow);

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {defval: ""});

        return rows.map((row) => {
            const normalized: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[normalizeHeader(key)] = value;
            }
            return normalized;
        });
    }

    /**
     * An .xlsx is a zip ("PK…") and carries its own encoding. Anything else
     * is CSV text, decoded here rather than by the parser, which reads
     * Cyrillic without a byte-order mark as Latin-1: UTF-8 when it is valid,
     * otherwise Windows-1251, what Excel in Russian saves "CSV" as (CA-7).
     * CSV cells stay text (raw), so "45,5" and "5 200 000" are read by
     * asNumber() instead of the parser treating the comma as a separator.
     */
    private readWorkbook(buffer: Buffer): XLSX.WorkBook {
        const isZip = buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b;
        if (isZip) return XLSX.read(buffer, {type: "buffer"});

        let text: string;
        try {
            text = new TextDecoder("utf-8", {fatal: true}).decode(buffer);
        } catch {
            text = new TextDecoder("windows-1251").decode(buffer);
        }
        return XLSX.read(text.replace(/^\uFEFF/, ""), {type: "string", raw: true});
    }

    /**
     * CA-7: a file whose headers don't match is one problem, not the same
     * "Block is required…" on every row. Says which columns are missing and
     * which were found, so the person can rename them.
     */
    private assertColumnsRecognised(headers: string[]) {
        const present = new Set(headers);
        const missing = REQUIRED_IMPORT_FIELDS.filter(
            (field) => !UNIT_IMPORT_COLUMN_ALIASES[field].some((alias) => present.has(alias)),
        );
        if (missing.length === 0) return;

        const recognised = REQUIRED_IMPORT_FIELDS.length - missing.length > 0 ||
            (["type", "rooms"] as UnitImportField[]).some((field) =>
                UNIT_IMPORT_COLUMN_ALIASES[field].some((alias) => present.has(alias)));
        throw new BadRequestException({
            statusCode: 400,
            error: "Bad Request",
            code: recognised ? "IMPORT_MISSING_COLUMNS" : "IMPORT_UNRECOGNISED_COLUMNS",
            missing,
            found: headers,
            message: recognised
                ? `The file is missing these columns: ${missing.join(", ")}.`
                : `None of the file's columns were recognised (${headers.join(", ") || "no header row"}). Expected: ${REQUIRED_IMPORT_FIELDS.join(", ")}.`,
        });
    }

    private extractField(row: Record<string, unknown>, field: UnitImportField): unknown {
        for (const alias of UNIT_IMPORT_COLUMN_ALIASES[field]) {
            const value = row[alias];
            if (value !== undefined && value !== "") {
                return value;
            }
        }
        return undefined;
    }

    private parseRow(raw: Record<string, unknown>): {row: ParsedUnitRow | null; problems: RowProblem[]} {
        const problems: RowProblem[] = [];

        const block = this.asString(this.extractField(raw, "block"));
        if (!block) problems.push({code: "blockRequired", message: "Block is required"});

        const entrance = this.asString(this.extractField(raw, "entrance"));
        if (!entrance) problems.push({code: "entranceRequired", message: "Entrance is required"});

        const floor = this.asInt(this.extractField(raw, "floor"));
        if (floor === null) problems.push({code: "floorInvalid", message: "Floor must be a whole number"});

        const number = this.asString(this.extractField(raw, "number"));
        if (!number) problems.push({code: "numberRequired", message: "Unit number is required"});

        const area = this.asPositiveNumber(this.extractField(raw, "area"));
        if (area === null) problems.push({code: "areaInvalid", message: "Area must be a positive number"});

        const price = this.asPositiveNumber(this.extractField(raw, "price"));
        if (price === null) problems.push({code: "priceInvalid", message: "Price must be a positive number"});

        let type: UnitType | undefined;
        const typeRaw = this.asString(this.extractField(raw, "type"));
        if (typeRaw) {
            const normalized = UNIT_TYPE_ALIASES[typeRaw.toLowerCase().replace(/ё/g, "е")] ?? typeRaw.toUpperCase();
            if (!UNIT_TYPE_VALUES.includes(normalized as UnitType)) {
                problems.push({
                    code: "typeInvalid",
                    message: `Type must be one of ${UNIT_TYPE_VALUES.join(", ")}`,
                    params: {value: typeRaw},
                });
            } else {
                type = normalized as UnitType;
            }
        }

        let rooms: number | undefined;
        const roomsRaw = this.extractField(raw, "rooms");
        if (roomsRaw !== undefined) {
            const parsedRooms = this.asInt(roomsRaw);
            if (parsedRooms === null) {
                problems.push({code: "roomsInvalid", message: "Rooms must be a whole number"});
            } else {
                rooms = parsedRooms;
            }
        }

        if (problems.length > 0 || !block || !entrance || floor === null || !number || area === null || price === null) {
            return {row: null, problems};
        }

        return {row: {block, entrance, floor, number, area, price, type, rooms}, problems: []};
    }

    private asString(value: unknown): string | undefined {
        if (value === undefined || value === null) return undefined;
        const trimmed = String(value).trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    /**
     * A number as a spreadsheet in Russian or Kyrgyz writes it, too:
     * "45,5" (decimal comma) and "5 200 000" (spaced thousands).
     */
    private asNumber(value: unknown): number {
        if (typeof value === "number") return value;
        let text = String(value).trim().replace(/[\s\u00a0\u202f]/g, "");
        if (text.includes(",") && !text.includes(".")) {
            // One comma with 1–2 digits after it is a decimal comma;
            // otherwise commas group thousands ("5,200,000").
            text = /^-?\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
        } else {
            text = text.replace(/,/g, "");
        }
        return text === "" ? NaN : Number(text);
    }

    private asInt(value: unknown): number | null {
        if (value === undefined || value === null || value === "") return null;
        const num = this.asNumber(value);
        return Number.isInteger(num) ? num : null;
    }

    private asPositiveNumber(value: unknown): number | null {
        if (value === undefined || value === null || value === "") return null;
        const num = this.asNumber(value);
        return Number.isFinite(num) && num > 0 ? num : null;
    }

    private async ensureProjectBelongsToCompany(projectId: string, companyId: string) {
        const project = await this.prisma.project.findFirst({
            where: {id: projectId, companyId},
            select: {id: true, name: true},
        });

        if (!project) {
            throw new BadRequestException("Project does not belong to your company");
        }

        return project;
    }
}

type HierarchyCache = {
    blocks: Map<string, {id: string}>;
    entrances: Map<string, {id: string}>;
    floors: Map<string, {id: string}>;
    unitNumbersByBlock: Map<string, Set<string>>;
    existingUnits: Map<string, ExistingUnit>;
    nextBlockOrder: number;
    nextEntranceOrder: Map<string, number>;
    nextFloorOrder: Map<string, number>;
};

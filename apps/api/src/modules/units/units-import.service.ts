import {BadRequestException, ForbiddenException, Injectable} from "@nestjs/common";
import * as XLSX from "xlsx";
import {UnitType} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {UNIT_IMPORT_COLUMN_ALIASES} from "./units-import.constants";
import {ImportUnitsResult} from "./dto/import-units-result.dto";

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

/** Distinguishes an expected, row-reportable problem from an unexpected DB error. */
class RowImportError extends Error {}

const UNIT_TYPE_VALUES = Object.values(UnitType);

@Injectable()
export class UnitsImportService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Bulk-creates units for a project from an uploaded CSV/XLSX (CA-C1).
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

        await this.ensureProjectBelongsToCompany(projectId, user.companyId);

        const rawRows = this.parseWorkbook(file.buffer);
        const cache = await this.seedHierarchyCache(projectId);

        const errors: ImportUnitsResult["errors"] = [];
        let created = 0;

        for (let index = 0; index < rawRows.length; index++) {
            // Row 1 is the header, so the first data row is row 2.
            const rowNumber = index + 2;
            const {row, messages} = this.parseRow(rawRows[index]);

            if (!row) {
                errors.push({row: rowNumber, messages});
                continue;
            }

            try {
                await this.createRow(projectId, row, cache);
                created++;
            } catch (error) {
                const message =
                    error instanceof RowImportError
                        ? error.message
                        : "Could not create this unit. Please check the row and try again.";
                errors.push({row: rowNumber, messages: [message]});
            }
        }

        return {created, failed: errors.length, errors};
    }

    /**
     * One row's writes — find-or-create Block, then Entrance, then Floor, then
     * the Unit itself — in a single short transaction scoped to this row only.
     * If the Unit insert fails after a fresh Block/Entrance/Floor was just
     * created for this row, this rolls back only that row's writes instead of
     * leaving an orphaned empty hierarchy chain behind. Earlier rows'
     * successes, already committed in their own transactions, are untouched.
     */
    private async createRow(projectId: string, row: ParsedUnitRow, cache: HierarchyCache) {
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
                throw new RowImportError(`Unit number "${row.number}" already exists in block "${row.block}"`);
            }

            await tx.unit.create({
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
            this.prisma.unit.findMany({where: {projectId}, select: {number: true, blockId: true}}),
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
        }

        return cache;
    }

    private parseWorkbook(buffer: Buffer): Record<string, unknown>[] {
        const workbook = XLSX.read(buffer, {type: "buffer"});
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            return [];
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {defval: ""});

        return rows.map((row) => {
            const normalized: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[key.trim().toLowerCase()] = value;
            }
            return normalized;
        });
    }

    private extractField(row: Record<string, unknown>, field: keyof typeof UNIT_IMPORT_COLUMN_ALIASES): unknown {
        for (const alias of UNIT_IMPORT_COLUMN_ALIASES[field]) {
            const value = row[alias];
            if (value !== undefined && value !== "") {
                return value;
            }
        }
        return undefined;
    }

    private parseRow(raw: Record<string, unknown>): {row: ParsedUnitRow | null; messages: string[]} {
        const messages: string[] = [];

        const block = this.asString(this.extractField(raw, "block"));
        if (!block) messages.push("Block is required");

        const entrance = this.asString(this.extractField(raw, "entrance"));
        if (!entrance) messages.push("Entrance is required");

        const floor = this.asInt(this.extractField(raw, "floor"));
        if (floor === null) messages.push("Floor must be a whole number");

        const number = this.asString(this.extractField(raw, "number"));
        if (!number) messages.push("Unit number is required");

        const area = this.asPositiveNumber(this.extractField(raw, "area"));
        if (area === null) messages.push("Area must be a positive number");

        const price = this.asPositiveNumber(this.extractField(raw, "price"));
        if (price === null) messages.push("Price must be a positive number");

        let type: UnitType | undefined;
        const typeRaw = this.asString(this.extractField(raw, "type"));
        if (typeRaw) {
            const normalized = typeRaw.toUpperCase();
            if (!UNIT_TYPE_VALUES.includes(normalized as UnitType)) {
                messages.push(`Type must be one of ${UNIT_TYPE_VALUES.join(", ")}`);
            } else {
                type = normalized as UnitType;
            }
        }

        let rooms: number | undefined;
        const roomsRaw = this.extractField(raw, "rooms");
        if (roomsRaw !== undefined) {
            const parsedRooms = this.asInt(roomsRaw);
            if (parsedRooms === null) {
                messages.push("Rooms must be a whole number");
            } else {
                rooms = parsedRooms;
            }
        }

        if (messages.length > 0 || !block || !entrance || floor === null || !number || area === null || price === null) {
            return {row: null, messages};
        }

        return {row: {block, entrance, floor, number, area, price, type, rooms}, messages: []};
    }

    private asString(value: unknown): string | undefined {
        if (value === undefined || value === null) return undefined;
        const trimmed = String(value).trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private asInt(value: unknown): number | null {
        if (value === undefined || value === null || value === "") return null;
        const num = typeof value === "number" ? value : Number(String(value).trim());
        return Number.isInteger(num) ? num : null;
    }

    private asPositiveNumber(value: unknown): number | null {
        if (value === undefined || value === null || value === "") return null;
        const num = typeof value === "number" ? value : Number(String(value).trim());
        return Number.isFinite(num) && num > 0 ? num : null;
    }

    private async ensureProjectBelongsToCompany(projectId: string, companyId: string) {
        const project = await this.prisma.project.findFirst({
            where: {id: projectId, companyId},
        });

        if (!project) {
            throw new BadRequestException("Project does not belong to your company");
        }
    }
}

type HierarchyCache = {
    blocks: Map<string, {id: string}>;
    entrances: Map<string, {id: string}>;
    floors: Map<string, {id: string}>;
    unitNumbersByBlock: Map<string, Set<string>>;
    nextBlockOrder: number;
    nextEntranceOrder: Map<string, number>;
    nextFloorOrder: Map<string, number>;
};

import {PrismaService} from "@/database/prisma.service";
import {UnitsImportService} from "./units-import.service";

function csvFile(rows: string[][]): Express.Multer.File {
    const buffer = Buffer.from(rows.map((row) => row.join(",")).join("\n"), "utf-8");
    return {
        buffer,
        originalname: "units.csv",
        mimetype: "text/csv",
    } as Express.Multer.File;
}

const actor = {
    id: "admin-1",
    email: "admin@crm.dev",
    name: "Admin",
    role: "COMPANY_ADMIN",
    companyId: "company-1",
    company: null,
} as any;

type SeedRow = {id: string; name?: string; number?: number; order: number; blockId?: string; entranceId?: string};

function build(seed: {blocks?: SeedRow[]; entrances?: SeedRow[]; floors?: SeedRow[]; units?: {number: string; blockId: string}[]} = {}) {
    let idCounter = 0;
    const nextId = () => `generated-${++idCounter}`;

    const tx = {
        block: {
            create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: nextId(), ...data})),
        },
        entrance: {
            create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: nextId(), ...data})),
        },
        floor: {
            create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: nextId(), ...data})),
        },
        unit: {
            create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: nextId(), ...data})),
        },
    };

    const prisma = {
        project: {findFirst: jest.fn().mockResolvedValue({id: "project-1", companyId: "company-1"})},
        block: {findMany: jest.fn().mockResolvedValue(seed.blocks ?? [])},
        entrance: {findMany: jest.fn().mockResolvedValue(seed.entrances ?? [])},
        floor: {findMany: jest.fn().mockResolvedValue(seed.floors ?? [])},
        unit: {findMany: jest.fn().mockResolvedValue(seed.units ?? [])},
        $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(tx)),
    };

    return {service: new UnitsImportService(prisma as unknown as PrismaService), prisma, tx};
}

describe("UnitsImportService (CA-C1)", () => {
    it("creates a unit under a newly auto-created block/entrance/floor", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, failed: 0, errors: []});
        expect(tx.block.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({name: "A", order: 1, projectId: "project-1"})}),
        );
        expect(tx.entrance.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({name: "1", order: 1})}),
        );
        expect(tx.floor.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({number: 5, order: 1})}),
        );
        expect(tx.unit.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({number: "501", area: 45.5, price: 50000, type: "APARTMENT"}),
            }),
        );
    });

    it("reuses an existing block/entrance/floor by name instead of creating duplicates", async () => {
        const {service, tx} = build({
            blocks: [{id: "b1", name: "A", order: 1}],
            entrances: [{id: "e1", name: "1", order: 1, blockId: "b1"}],
            floors: [{id: "f1", number: 5, order: 1, entranceId: "e1"}],
        });
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            // Different case on purpose — matching is case-insensitive.
            ["a", "1", "5", "502", "40", "45000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, failed: 0, errors: []});
        expect(tx.block.create).not.toHaveBeenCalled();
        expect(tx.entrance.create).not.toHaveBeenCalled();
        expect(tx.floor.create).not.toHaveBeenCalled();
        expect(tx.unit.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({blockId: "b1", entranceId: "e1", floorId: "f1"})}),
        );
    });

    it("reports a bad row without aborting the rest of the batch", async () => {
        const {service} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "45.5", "50000"],
            ["A", "1", "5", "502", "not-a-number", "50000"],
            ["A", "1", "5", "503", "50", "60000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.created).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.errors).toEqual([
            {row: 3, messages: expect.arrayContaining([expect.stringContaining("Area")])},
        ]);
    });

    it("rejects a duplicate unit number within the same block as a row failure, not a thrown error", async () => {
        const {service} = build({
            blocks: [{id: "b1", name: "A", order: 1}],
            entrances: [{id: "e1", name: "1", order: 1, blockId: "b1"}],
            floors: [{id: "f1", number: 5, order: 1, entranceId: "e1"}],
            units: [{number: "501", blockId: "b1"}],
        });
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.created).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0].messages[0]).toContain("already exists");
    });

    it("accepts header aliases (unit/base_price) case-insensitively", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["Block", "Entrance", "Floor", "Unit", "Area", "Base_Price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, failed: 0, errors: []});
        expect(tx.unit.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({number: "501", price: 50000})}),
        );
    });
});

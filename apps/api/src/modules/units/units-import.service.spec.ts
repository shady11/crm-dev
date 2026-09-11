import {BadRequestException, ForbiddenException} from "@nestjs/common";
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

    it("rejects when the user has no company", async () => {
        const {service} = build();
        const file = csvFile([["block", "entrance", "floor", "number", "area", "price"]]);

        await expect(
            service.importFromFile({...actor, companyId: null}, "project-1", file),
        ).rejects.toThrow(ForbiddenException);
    });

    it("rejects when no file was uploaded", async () => {
        const {service} = build();
        await expect(service.importFromFile(actor, "project-1", undefined as any)).rejects.toThrow(
            BadRequestException,
        );
    });

    it("rejects a project that does not belong to the caller's company", async () => {
        const {service, prisma} = build();
        prisma.project.findFirst.mockResolvedValue(null);
        const file = csvFile([["block", "entrance", "floor", "number", "area", "price"]]);

        await expect(service.importFromFile(actor, "other-project", file)).rejects.toThrow(BadRequestException);
    });

    it("reports every missing/invalid required field on a row as a distinct message", async () => {
        const {service} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["", "", "not-a-number", "", "not-a-number", "not-a-number"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.created).toBe(0);
        expect(result.errors[0].messages).toEqual([
            "Block is required",
            "Entrance is required",
            "Floor must be a whole number",
            "Unit number is required",
            "Area must be a positive number",
            "Price must be a positive number",
        ]);
    });

    it("rejects a non-positive area or price", async () => {
        const {service} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "0", "-100"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.errors[0].messages).toEqual(
            expect.arrayContaining(["Area must be a positive number", "Price must be a positive number"]),
        );
    });

    it("accepts an explicit unit type, normalized to uppercase", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price", "type"],
            ["A", "1", "5", "501", "45.5", "50000", "commercial"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, failed: 0, errors: []});
        expect(tx.unit.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({type: "COMMERCIAL"})}),
        );
    });

    it("rejects an unrecognized unit type", async () => {
        const {service} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price", "type"],
            ["A", "1", "5", "501", "45.5", "50000", "MANSION"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.created).toBe(0);
        expect(result.errors[0].messages[0]).toContain("Type must be one of");
    });

    it("parses an explicit rooms count and rejects a non-integer one", async () => {
        const {service, tx} = build();
        const good = csvFile([
            ["block", "entrance", "floor", "number", "area", "price", "rooms"],
            ["A", "1", "5", "501", "45.5", "50000", "3"],
        ]);
        await service.importFromFile(actor, "project-1", good);
        expect(tx.unit.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({rooms: 3})}));

        const {service: service2} = build();
        const bad = csvFile([
            ["block", "entrance", "floor", "number", "area", "price", "rooms"],
            ["A", "1", "5", "501", "45.5", "50000", "two"],
        ]);
        const result = await service2.importFromFile(actor, "project-1", bad);
        expect(result.errors[0].messages).toContain("Rooms must be a whole number");
    });

    it("assigns increasing order to multiple newly created blocks within one import", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "1", "101", "40", "40000"],
            ["B", "1", "1", "101", "40", "40000"],
        ]);

        await service.importFromFile(actor, "project-1", file);

        const orders = (tx.block.create as jest.Mock).mock.calls.map((call) => call[0].data.order);
        expect(orders).toEqual([1, 2]);
    });

    it("continues block order numbering from the highest existing order in the project", async () => {
        const {service, tx} = build({blocks: [{id: "b1", name: "A", order: 3}]});
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["B", "1", "1", "101", "40", "40000"],
        ]);

        await service.importFromFile(actor, "project-1", file);

        expect(tx.block.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({order: 4})}));
    });

    it("falls back to a generic message for an unexpected (non-row) error during row creation", async () => {
        const {service, tx} = build();
        tx.unit.create.mockRejectedValueOnce(new Error("connection reset"));
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result.created).toBe(0);
        expect(result.errors[0].messages[0]).toBe("Could not create this unit. Please check the row and try again.");
    });

    it("resolves the number column through its aliases in priority order", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "unit_number", "unitnumber", "area", "price"],
            ["A", "1", "5", "first-alias", "second-alias", "45.5", "50000"],
        ]);

        await service.importFromFile(actor, "project-1", file);

        expect(tx.unit.create).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({number: "first-alias"})}),
        );
    });

    it("returns an empty result for a workbook with no rows", async () => {
        const {service} = build();
        const file = csvFile([["block", "entrance", "floor", "number", "area", "price"]]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 0, failed: 0, errors: []});
    });
});

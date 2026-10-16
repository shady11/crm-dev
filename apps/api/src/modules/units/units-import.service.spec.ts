import {BadRequestException, ForbiddenException} from "@nestjs/common";
import * as XLSX from "xlsx";
import {PrismaService} from "@/database/prisma.service";
import {UnitsImportService} from "./units-import.service";
import {UnitPriceRequestsService} from "./unit-price-requests.service";

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
    permissions: ["inventory.manage", "units.edit_price", "units.approve_price"],
} as any;

/** The fields a successful import returns besides `created`. */
const clean = {pricesUpdated: 0, pricesRequested: 0, unchanged: 0, keptPrices: [], failed: 0, errors: []};

type SeedRow = {id: string; name?: string; number?: number; order: number; blockId?: string; entranceId?: string};

type SeedUnit = {id?: string; number: string; blockId: string; price?: number; status?: string};

function build(seed: {blocks?: SeedRow[]; entrances?: SeedRow[]; floors?: SeedRow[]; units?: SeedUnit[]} = {}) {
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
        project: {findFirst: jest.fn().mockResolvedValue({id: "project-1", name: "ЖК Орион"})},
        block: {findMany: jest.fn().mockResolvedValue(seed.blocks ?? [])},
        entrance: {findMany: jest.fn().mockResolvedValue(seed.entrances ?? [])},
        floor: {findMany: jest.fn().mockResolvedValue(seed.floors ?? [])},
        unit: {
            findMany: jest.fn().mockResolvedValue(
                (seed.units ?? []).map((u, i) => ({id: u.id ?? `unit-${i}`, price: 50000, status: "AVAILABLE", ...u})),
            ),
            update: jest.fn().mockResolvedValue({}),
        },
        $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(tx)),
        activity: {create: jest.fn().mockResolvedValue({id: "activity-1"})},
    };

    const priceRequests = {
        handlePriceChange: jest.fn().mockResolvedValue({outcome: "apply"}),
        notifyImportedPrices: jest.fn().mockResolvedValue(undefined),
    };

    return {
        service: new UnitsImportService(prisma as unknown as PrismaService, priceRequests as unknown as UnitPriceRequestsService),
        prisma,
        tx,
        priceRequests,
    };
}

describe("UnitsImportService (CA-C1)", () => {
    it("creates a unit under a newly auto-created block/entrance/floor", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["block", "entrance", "floor", "number", "area", "price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, ...clean});
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

        expect(result).toEqual({created: 1, ...clean});
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
            {row: 3, messages: expect.arrayContaining([expect.stringContaining("Area")]), codes: [{code: "areaInvalid"}]},
        ]);
    });

    it("accepts header aliases (unit/base_price) case-insensitively", async () => {
        const {service, tx} = build();
        const file = csvFile([
            ["Block", "Entrance", "Floor", "Unit", "Area", "Base_Price"],
            ["A", "1", "5", "501", "45.5", "50000"],
        ]);

        const result = await service.importFromFile(actor, "project-1", file);

        expect(result).toEqual({created: 1, ...clean});
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

        expect(result).toEqual({created: 1, ...clean});
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

        expect(result).toEqual({created: 0, ...clean});
    });

    describe("CA-7: headers in Russian and Kyrgyz, and a clear file-level error", () => {
        const seededProject = () => build({
            blocks: [{id: "b1", name: "A", order: 1}],
            entrances: [{id: "e1", name: "1", order: 1, blockId: "b1"}],
            floors: [{id: "f1", number: 5, order: 1, entranceId: "e1"}],
        });

        it("reads Russian headers, with units and notes in them, and Russian type names", async () => {
            const {service, tx} = build();
            const file = csvFile([
                ["Блок", "Подъезд", "Этаж", "№ квартиры", "Площадь (м²)", "Цена*", "Тип", "Кол-во комнат"],
                ["А", "1", "5", "501", "45.5", "5200000", "Коммерческое", "2"],
            ]);

            const result = await service.importFromFile(actor, "project-1", file);

            expect(result).toEqual({created: 1, ...clean});
            expect(tx.unit.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({number: "501", area: 45.5, price: 5200000, type: "COMMERCIAL", rooms: 2}),
            }));
        });

        it("reads Kyrgyz headers", async () => {
            const {service, tx} = build();
            const file = csvFile([
                ["Блок", "Кире бериш", "Кабат", "Номер", "Аянт", "Баа", "Түрү", "Бөлмөлөр"],
                ["А", "1", "5", "501", "45.5", "5200000", "батир", "1"],
            ]);

            expect(await service.importFromFile(actor, "project-1", file)).toEqual({created: 1, ...clean});
            expect(tx.unit.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({type: "APARTMENT"})}));
        });

        it("reads a Windows-1251 CSV with semicolons, decimal commas and spaced thousands, as Excel in Russian saves it", async () => {
            const {service, tx} = build();
            const text = "Блок;Подъезд;Этаж;Номер;Площадь;Цена\r\nБлок Б;1;5;501;45,5;5 200 000\r\n";
            const buffer = Buffer.from(new Uint8Array([...text].map((ch) => {
                const code = ch.charCodeAt(0);
                return code >= 0x410 && code <= 0x44f ? code - 0x350 : code; // А–я in Windows-1251
            })));

            const result = await service.importFromFile(actor, "project-1", {buffer, originalname: "units.csv"} as Express.Multer.File);

            expect(result).toEqual({created: 1, ...clean});
            expect(tx.block.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({name: "Блок Б"})}));
            expect(tx.unit.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({area: 45.5, price: 5200000}),
            }));
        });

        it("reads Cyrillic in a UTF-8 CSV without a byte-order mark", async () => {
            const {service, tx} = build();
            await service.importFromFile(actor, "project-1", csvFile([
                ["block", "entrance", "floor", "number", "area", "price"],
                ["Блок Б", "1", "5", "501", "45", "5200000"],
            ]));
            expect(tx.block.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({name: "Блок Б"})}));
        });

        it("refuses a file with no recognisable column once, saying what it expected", async () => {
            const {service} = build();
            const file = csvFile([["Корпус-секция", "Квадратура"], ["А", "45"]]);

            await expect(service.importFromFile(actor, "project-1", file)).rejects.toMatchObject({
                response: expect.objectContaining({
                    code: "IMPORT_UNRECOGNISED_COLUMNS",
                    missing: ["block", "entrance", "floor", "number", "area", "price"],
                    found: ["корпус-секция", "квадратура"],
                }),
            });
        });

        it("names the missing columns when only some are recognised", async () => {
            const {service} = build();
            const file = csvFile([["Блок", "Подъезд", "Этаж", "Номер"], ["А", "1", "5", "501"]]);

            await expect(service.importFromFile(actor, "project-1", file)).rejects.toMatchObject({
                response: expect.objectContaining({code: "IMPORT_MISSING_COLUMNS", missing: ["area", "price"]}),
            });
        });

        it("gives each row problem a code the web app can translate", async () => {
            const {service} = build();
            const file = csvFile([["block", "entrance", "floor", "number", "area", "price", "type"], ["A", "1", "x", "501", "45", "100", "MANSION"]]);

            const result = await service.importFromFile(actor, "project-1", file);

            expect(result.errors[0].codes).toEqual([{code: "floorInvalid"}, {code: "typeInvalid", params: {value: "MANSION"}}]);
        });

        it("builds a sample whose headers, in each language, import back cleanly", async () => {
            for (const lang of ["en", "ru", "ky"]) {
                const {service} = build();
                const sample = service.buildSample(lang);
                const headers = XLSX.utils.sheet_to_json<string[]>(XLSX.read(sample).Sheets.Units, {header: 1})[0];
                expect(headers[0]).toBe({en: "Block", ru: "Блок", ky: "Блок"}[lang]);

                const result = await service.importFromFile(actor, "project-1", {buffer: sample, originalname: "s.xlsx"} as Express.Multer.File);
                expect(result).toEqual({created: 3, ...clean});
            }
        });

        it("reports a unit repeated within the file instead of treating it as a price change", async () => {
            const {service, priceRequests} = build();
            const file = csvFile([
                ["block", "entrance", "floor", "number", "area", "price"],
                ["A", "1", "5", "501", "45", "50000"],
                ["A", "1", "5", "501", "45", "60000"],
            ]);

            const result = await service.importFromFile(actor, "project-1", file);

            expect(result.created).toBe(1);
            expect(result.errors).toEqual([expect.objectContaining({row: 3, codes: [expect.objectContaining({code: "duplicateInFile"})]})]);
            expect(priceRequests.handlePriceChange).not.toHaveBeenCalled();
        });

        describe("re-importing: a new price applies to available units only", () => {
            const fileFor = (price: string) => csvFile([
                ["block", "entrance", "floor", "number", "area", "price"],
                ["A", "1", "5", "501", "45.5", price],
            ]);

            it("applies a new price to an available unit for someone who approves prices, quietly per unit", async () => {
                const {service, prisma, tx, priceRequests} = build({units: [{id: "u1", number: "501", blockId: "b1", price: 50000}]});
                prisma.block.findMany.mockResolvedValue([{id: "b1", name: "A", order: 1}]);

                const result = await service.importFromFile(actor, "project-1", fileFor("55000"));

                expect(result).toEqual({...clean, created: 0, pricesUpdated: 1});
                expect(tx.unit.create).not.toHaveBeenCalled();
                expect(priceRequests.handlePriceChange).toHaveBeenCalledWith(
                    actor, expect.objectContaining({id: "u1", price: 50000, project: {name: "ЖК Орион"}}), 55000, {notify: false},
                );
                expect(prisma.unit.update).toHaveBeenCalledWith({where: {id: "u1"}, data: {price: 55000}});
                expect(priceRequests.notifyImportedPrices).toHaveBeenCalledTimes(1);
                expect(priceRequests.notifyImportedPrices).toHaveBeenCalledWith(actor, {
                    projectId: "project-1", project: "ЖК Орион", updated: 1, requested: 0,
                });
                expect(prisma.activity.create).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({templateKey: "unitsImportedWithPrices"}),
                }));
            });

            it("sends the new price for approval when the importer can't approve prices", async () => {
                const {service, prisma, priceRequests} = build({units: [{id: "u1", number: "501", blockId: "b1"}]});
                prisma.block.findMany.mockResolvedValue([{id: "b1", name: "A", order: 1}]);
                priceRequests.handlePriceChange.mockResolvedValue({outcome: "requested", requestId: "r1"});

                const result = await service.importFromFile(actor, "project-1", fileFor("55000"));

                expect(result).toEqual({...clean, created: 0, pricesRequested: 1});
                expect(prisma.unit.update).not.toHaveBeenCalled();
                expect(priceRequests.notifyImportedPrices).toHaveBeenCalledWith(actor, expect.objectContaining({updated: 0, requested: 1}));
            });

            it.each(["RESERVED", "SOLD", "UNAVAILABLE"])("keeps the price of a %s unit and reports it", async (status) => {
                const {service, prisma, priceRequests} = build({units: [{id: "u1", number: "501", blockId: "b1", status}]});
                prisma.block.findMany.mockResolvedValue([{id: "b1", name: "A", order: 1}]);

                const result = await service.importFromFile(actor, "project-1", fileFor("55000"));

                expect(result).toEqual({
                    ...clean, created: 0,
                    keptPrices: [{row: 2, block: "A", number: "501", status, currentPrice: 50000, filePrice: 55000}],
                });
                expect(priceRequests.handlePriceChange).not.toHaveBeenCalled();
                expect(prisma.unit.update).not.toHaveBeenCalled();
                expect(priceRequests.notifyImportedPrices).not.toHaveBeenCalled();
            });

            it("counts an existing unit with the same price as unchanged", async () => {
                const {service, prisma, priceRequests} = build({units: [{id: "u1", number: "501", blockId: "b1"}]});
                prisma.block.findMany.mockResolvedValue([{id: "b1", name: "A", order: 1}]);

                const result = await service.importFromFile(actor, "project-1", fileFor("50000"));

                expect(result).toEqual({...clean, created: 0, unchanged: 1});
                expect(priceRequests.handlePriceChange).not.toHaveBeenCalled();
                expect(prisma.activity.create).not.toHaveBeenCalled();
            });

            it("reports a price change as a row problem for someone without units.edit_price", async () => {
                const {service, prisma, priceRequests} = build({units: [{id: "u1", number: "501", blockId: "b1"}]});
                prisma.block.findMany.mockResolvedValue([{id: "b1", name: "A", order: 1}]);

                const result = await service.importFromFile({...actor, permissions: ["inventory.manage"]}, "project-1", fileFor("55000"));

                expect(result.errors).toEqual([expect.objectContaining({row: 2, codes: [{code: "priceNotAllowed", params: {number: "501"}}]})]);
                expect(priceRequests.handlePriceChange).not.toHaveBeenCalled();
            });
        });

        void seededProject;
    });
});

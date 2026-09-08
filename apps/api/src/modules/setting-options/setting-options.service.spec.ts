import {BadRequestException, ConflictException, NotFoundException} from "@nestjs/common";
import {PrismaService} from "@/database/prisma.service";
import {SettingOptionsService} from "./setting-options.service";

describe("SettingOptionsService", () => {
    const build = (over: {existing?: unknown; option?: unknown; companyCount?: number} = {}) => {
        const create = jest.fn().mockImplementation(({data}) => Promise.resolve({id: "opt-1", ...data}));
        const update = jest.fn().mockImplementation(({data}) => Promise.resolve({id: "opt-1", ...data}));
        const remove = jest.fn().mockResolvedValue(undefined);

        const prisma = {
            settingOption: {
                findUnique: jest.fn().mockResolvedValue(over.existing ?? over.option ?? null),
                create,
                update,
                delete: remove,
                findMany: jest.fn().mockResolvedValue([]),
            },
            company: {count: jest.fn().mockResolvedValue(over.companyCount ?? 0)},
        } as unknown as PrismaService;

        return {service: new SettingOptionsService(prisma), create, update, remove, prisma};
    };

    it("refuses a currency code Intl cannot format", async () => {
        const {service} = build();

        await expect(
            service.create({type: "CURRENCY", code: "NOTREAL", label: "Fake"}),
        ).rejects.toThrow(BadRequestException);
    });

    it("refuses a timezone Intl does not recognise", async () => {
        const {service} = build();

        await expect(
            service.create({type: "TIMEZONE", code: "Not/A_Zone", label: "Fake"}),
        ).rejects.toThrow(BadRequestException);
    });

    it("creates a valid option", async () => {
        const {service, create} = build();

        await service.create({type: "CURRENCY", code: "USD", label: "US Dollar"});

        expect(create).toHaveBeenCalledWith({
            data: {type: "CURRENCY", code: "USD", label: "US Dollar"},
        });
    });

    it("refuses a duplicate (type, code)", async () => {
        const {service} = build({existing: {id: "opt-1", type: "CURRENCY", code: "USD"}});

        await expect(
            service.create({type: "CURRENCY", code: "USD", label: "US Dollar"}),
        ).rejects.toThrow(ConflictException);
    });

    it("refuses to delete an option in use by a company", async () => {
        const {service} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", label: "US Dollar", isActive: true},
            companyCount: 1,
        });

        await expect(service.remove("opt-1")).rejects.toThrow(ConflictException);
    });

    it("deletes an option nothing references", async () => {
        const {service, remove} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", label: "US Dollar", isActive: true},
            companyCount: 0,
        });

        await service.remove("opt-1");

        expect(remove).toHaveBeenCalledWith({where: {id: "opt-1"}});
    });

    it("404s on an unknown id", async () => {
        const {service} = build({option: null});

        await expect(service.update("missing", {label: "X"})).rejects.toThrow(NotFoundException);
    });

    it("assertActiveOption rejects an inactive option", async () => {
        const {service} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", isActive: false},
        });

        await expect(service.assertActiveOption("CURRENCY", "USD")).rejects.toThrow(BadRequestException);
    });

    it("assertActiveOption accepts an active option", async () => {
        const {service} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", isActive: true},
        });

        await expect(service.assertActiveOption("CURRENCY", "USD")).resolves.toBeUndefined();
    });
});

import {BadRequestException, ConflictException, NotFoundException} from "@nestjs/common";
import {PrismaService} from "@/database/prisma.service";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {SettingOptionsService} from "./setting-options.service";

const actor: AuthUser = {
    id: "super-1",
    email: "ops@crm.dev",
    name: "Ops",
    roleId: "role-super-admin",
    roleName: "Super Admin",
    isSuperAdmin: true,
    companyId: null,
    company: null,
    branchId: null,
    branch: null,
};

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
        const auditLog = {record: jest.fn().mockResolvedValue(undefined)} as unknown as AuditLogService;

        return {service: new SettingOptionsService(prisma, auditLog), create, update, remove, prisma, auditLog};
    };

    it("refuses a currency code Intl cannot format", async () => {
        const {service} = build();

        await expect(
            service.create(actor, {type: "CURRENCY", code: "NOTREAL", label: "Fake"}),
        ).rejects.toThrow(BadRequestException);
    });

    it("refuses a timezone Intl does not recognise", async () => {
        const {service} = build();

        await expect(
            service.create(actor, {type: "TIMEZONE", code: "Not/A_Zone", label: "Fake"}),
        ).rejects.toThrow(BadRequestException);
    });

    it("creates a valid option", async () => {
        const {service, create} = build();

        await service.create(actor, {type: "CURRENCY", code: "USD", label: "US Dollar"});

        expect(create).toHaveBeenCalledWith({
            data: {type: "CURRENCY", code: "USD", label: "US Dollar"},
        });
    });

    it("audits the creation", async () => {
        const {service, auditLog} = build();

        await service.create(actor, {type: "CURRENCY", code: "USD", label: "US Dollar"});

        expect(auditLog.record).toHaveBeenCalledWith(
            expect.objectContaining({action: "SETTING_OPTION_CREATED", actorId: "super-1"}),
        );
    });

    it("refuses a duplicate (type, code)", async () => {
        const {service} = build({existing: {id: "opt-1", type: "CURRENCY", code: "USD"}});

        await expect(
            service.create(actor, {type: "CURRENCY", code: "USD", label: "US Dollar"}),
        ).rejects.toThrow(ConflictException);
    });

    it("refuses to delete an option in use by a company", async () => {
        const {service} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", label: "US Dollar", isActive: true},
            companyCount: 1,
        });

        await expect(service.remove(actor, "opt-1")).rejects.toThrow(ConflictException);
    });

    it("deletes an option nothing references", async () => {
        const {service, remove} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", label: "US Dollar", isActive: true},
            companyCount: 0,
        });

        await service.remove(actor, "opt-1");

        expect(remove).toHaveBeenCalledWith({where: {id: "opt-1"}});
    });

    it("audits the deletion", async () => {
        const {service, auditLog} = build({
            option: {id: "opt-1", type: "CURRENCY", code: "USD", label: "US Dollar", isActive: true},
            companyCount: 0,
        });

        await service.remove(actor, "opt-1");

        expect(auditLog.record).toHaveBeenCalledWith(
            expect.objectContaining({action: "SETTING_OPTION_DELETED", targetId: "opt-1"}),
        );
    });

    it("404s on an unknown id", async () => {
        const {service} = build({option: null});

        await expect(service.update(actor, "missing", {label: "X"})).rejects.toThrow(NotFoundException);
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

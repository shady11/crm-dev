import {BadRequestException, ConflictException, ForbiddenException, NotFoundException} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {ImpersonationService} from "@/modules/impersonation/impersonation.service";
import {SettingOptionsService} from "@/modules/setting-options/setting-options.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CompaniesService} from "./companies.service";

const actor: AuthUser = {
    id: "super-1",
    email: "ops@crm.dev",
    name: "Ops",
    role: UserRole.SUPER_ADMIN,
    companyId: null,
    company: null,
    branchId: null,
    branch: null,
};

const auditLog = {record: jest.fn()} as unknown as AuditLogService;
const impersonation = {} as unknown as ImpersonationService;
const settingOptions = {
    assertActiveOption: jest.fn().mockResolvedValue(undefined),
} as unknown as SettingOptionsService;

describe("CompaniesService", () => {
    const baseDto = {
        name: "Bishkek Dev",
        adminFullName: "Aibek",
        adminEmail: "Admin@BishkekDev.KG",
    };

    const build = (over: {existingUser?: unknown; existingCompany?: unknown} = {}) => {
        const created: {company?: unknown; user?: any} = {};

        const tx = {
            company: {
                create: jest.fn().mockImplementation(({data}) => {
                    created.company = data;
                    return Promise.resolve({id: "company-1", ...data});
                }),
            },
            user: {
                create: jest.fn().mockImplementation(({data}) => {
                    created.user = data;
                    return Promise.resolve(data);
                }),
            },
        };

        const prisma = {
            user: {findUnique: jest.fn().mockResolvedValue(over.existingUser ?? null)},
            company: {findFirst: jest.fn().mockResolvedValue(over.existingCompany ?? null)},
            $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
        } as unknown as PrismaService;

        return {service: new CompaniesService(prisma, auditLog, impersonation, settingOptions), created};
    };

    it("creates the company and its first admin together", async () => {
        const {service, created} = build();

        await service.create(actor, {...baseDto});

        expect(created.company).toMatchObject({name: "Bishkek Dev"});
        expect(created.user).toMatchObject({role: UserRole.COMPANY_ADMIN, companyId: "company-1"});
    });

    it("normalises the admin email so a differently-cased duplicate cannot slip through", async () => {
        const {service, created} = build();

        await service.create(actor, {...baseDto});

        expect(created.user.email).toBe("admin@bishkekdev.kg");
    });

    it("defaults currency and locale to the pilot market rather than leaving them null", async () => {
        // A null currency renders as a dollar sign in the UI regardless of where
        // the company actually is.
        const {service, created} = build();

        await service.create(actor, {...baseDto});

        expect(created.company).toMatchObject({currency: "KGS", locale: "ru-RU"});
    });

    it("returns a generated password once and stores only its hash", async () => {
        const {service, created} = build();

        const result = await service.create(actor, {...baseDto});
        const password = result.admin.generatedPassword;

        expect(typeof password).toBe("string");
        expect(created.user.passwordHash).not.toBe(password);
        await expect(bcrypt.compare(password as string, created.user.passwordHash)).resolves.toBe(true);
    });

    it("does not echo a password the caller supplied", async () => {
        const {service} = build();

        const result = await service.create(actor, {...baseDto, adminPassword: "chosen-password"});

        expect(result.admin.generatedPassword).toBeUndefined();
    });

    it("refuses an admin email that already exists anywhere", async () => {
        // Email is globally unique across tenants, so this has to be checked
        // before the transaction or it fails on a raw constraint instead.
        const {service} = build({existingUser: {id: "someone"}});

        await expect(service.create(actor, {...baseDto})).rejects.toThrow(ConflictException);
    });

    it("refuses a duplicate company name", async () => {
        const {service} = build({existingCompany: {id: "company-9"}});

        await expect(service.create(actor, {...baseDto})).rejects.toThrow(ConflictException);
    });
});

describe("CompaniesService suspension", () => {
    const build = (company: unknown) => {
        const update = jest.fn().mockImplementation(({data}) => Promise.resolve(data));
        const prisma = {
            company: {findFirst: jest.fn().mockResolvedValue(company), update},
            project: {count: jest.fn().mockResolvedValue(0)},
            unit: {count: jest.fn().mockResolvedValue(0)},
            client: {count: jest.fn().mockResolvedValue(0)},
            lead: {count: jest.fn().mockResolvedValue(0)},
            deal: {count: jest.fn().mockResolvedValue(0)},
        } as unknown as PrismaService;

        return {service: new CompaniesService(prisma, auditLog, impersonation, settingOptions), update};
    };

    const active = {id: "c1", name: "X", suspendedAt: null, users: []};
    const suspended = {...active, suspendedAt: new Date("2026-01-01")};

    it("suspending sets a timestamp and touches nothing else", async () => {
        // Specifically: it does not modify user rows. The company check in
        // SessionValidationService is what stops those users, which is what
        // makes suspension reversible without guessing prior account state.
        const {service, update} = build(active);

        await service.suspend(actor, "c1");

        expect(update).toHaveBeenCalledTimes(1);
        expect(update.mock.calls[0][0].data).toEqual({suspendedAt: expect.any(Date)});
    });

    it("refuses to suspend an already-suspended company", async () => {
        const {service, update} = build(suspended);

        await expect(service.suspend(actor, "c1")).rejects.toThrow(ConflictException);
        expect(update).not.toHaveBeenCalled();
    });

    it("resuming clears the timestamp", async () => {
        const {service, update} = build(suspended);

        await service.resume(actor, "c1");

        expect(update.mock.calls[0][0].data).toEqual({suspendedAt: null});
    });

    it("refuses to resume a company that is not suspended", async () => {
        const {service} = build(active);

        await expect(service.resume(actor, "c1")).rejects.toThrow(ConflictException);
    });

    it("deleting sets deletedAt and leaves the tenant's data intact", async () => {
        // A developer's deals and payment history are exactly what they would
        // need if they came back or disputed something — one click should not
        // be able to destroy them.
        const {service, update} = build(active);

        await service.remove(actor, "c1");

        expect(update.mock.calls[0][0].data).toEqual({deletedAt: expect.any(Date)});
    });
});

describe("CompaniesService self-service (CA-A1)", () => {
    const companyAdmin: AuthUser = {
        id: "admin-1",
        email: "admin@bishkekdev.kg",
        name: "Aibek",
        role: UserRole.COMPANY_ADMIN,
        companyId: "company-1",
        company: {id: "company-1", name: "Bishkek Dev", currency: "KGS", locale: "ru-RU", timezone: "Asia/Bishkek"},
        branchId: null,
        branch: null,
    };

    const build = (company: unknown = {id: "company-1", name: "Bishkek Dev", users: []}) => {
        const update = jest.fn().mockImplementation(({data}) => Promise.resolve({...(company as object), ...data}));
        const findFirst = jest.fn().mockResolvedValue(company);
        const prisma = {
            company: {
                findFirst,
                update,
                findUniqueOrThrow: jest.fn().mockResolvedValue(company),
            },
            project: {count: jest.fn().mockResolvedValue(0)},
            unit: {count: jest.fn().mockResolvedValue(0)},
            client: {count: jest.fn().mockResolvedValue(0)},
            lead: {count: jest.fn().mockResolvedValue(0)},
            deal: {count: jest.fn().mockResolvedValue(0)},
        } as unknown as PrismaService;

        return {service: new CompaniesService(prisma, auditLog, impersonation, settingOptions), update, findFirst};
    };

    it("reads only the caller's own company, never one supplied by the client", async () => {
        const {service, findFirst} = build();

        await service.findOwn(companyAdmin);

        expect(findFirst.mock.calls[0][0].where).toMatchObject({id: "company-1"});
    });

    it("refuses to read or edit for an actor with no company", async () => {
        const {service} = build();
        const noCompany: AuthUser = {...companyAdmin, companyId: null, company: null};

        await expect(service.findOwn(noCompany)).rejects.toThrow(ForbiddenException);
        await expect(service.updateOwn(noCompany, {currency: "USD"})).rejects.toThrow(ForbiddenException);
    });

    it("updates currency/locale/timezone/name scoped to the actor's own companyId", async () => {
        const {service, update} = build();

        await service.updateOwn(companyAdmin, {currency: "USD", locale: "en-US", timezone: "UTC"});

        expect(update.mock.calls[0][0]).toMatchObject({
            where: {id: "company-1"},
            data: {currency: "USD", locale: "en-US", timezone: "UTC"},
        });
    });

    it("404s rather than leaking existence of a company that is gone", async () => {
        const {service} = build(null);

        await expect(service.findOwn(companyAdmin)).rejects.toThrow(NotFoundException);
    });

    it("refuses to change currency once the company has real deals", async () => {
        const {service} = build({id: "company-1", name: "Bishkek Dev", currency: "KGS", users: []});
        const prisma = (service as unknown as {prisma: PrismaService}).prisma;
        (prisma.deal.count as jest.Mock).mockResolvedValue(3);

        await expect(service.updateOwn(companyAdmin, {currency: "USD"})).rejects.toThrow(BadRequestException);
    });

    it("allows a currency change while the company has no deals yet", async () => {
        const {service, update} = build({id: "company-1", name: "Bishkek Dev", currency: "KGS", users: []});

        await service.updateOwn(companyAdmin, {currency: "USD"});

        expect(update).toHaveBeenCalled();
    });

    it("allows saving the same currency the company already has", async () => {
        const {service, update} = build({id: "company-1", name: "Bishkek Dev", currency: "KGS", users: []});
        const prisma = (service as unknown as {prisma: PrismaService}).prisma;
        (prisma.deal.count as jest.Mock).mockResolvedValue(3);

        await service.updateOwn(companyAdmin, {currency: "KGS"});

        expect(update).toHaveBeenCalled();
    });
});

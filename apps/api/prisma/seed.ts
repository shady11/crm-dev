/**
 * One entry point for every database-seeding/provisioning task:
 *
 *   npx tsx prisma/seed.ts
 *     Local demo data only: a fixed company, sample inventory, and an
 *     admin@crm.dev / password123 account. Refuses outside development.
 *     This is also what `npx prisma db seed` (and `prisma migrate dev`,
 *     which runs it automatically) invoke with no arguments — so this has
 *     to stay the default mode, never a production-provisioning path.
 *
 *   npx tsx prisma/seed.ts --mode provision-tenant \
 *     --company "Bishkek Dev" \
 *     --admin-email admin@bishkekdev.kg \
 *     --admin-name "Aibek Kendirbaev" \
 *     [--currency KGS] [--locale ru-RU] [--timezone Asia/Bishkek]
 *     Creates one real tenant and its first administrator. Nothing else —
 *     no demo inventory, no well-known password. Idempotent: run it twice
 *     and the second run reports what already exists rather than creating
 *     duplicates or resetting a password someone is using.
 *
 *   npx tsx prisma/seed.ts --mode provision-super-admin \
 *     --email ops@yourdomain.kg --name "Aibek Kendirbaev"
 *     Creates the platform's first SUPER_ADMIN. Has to be a script: a
 *     SUPER_ADMIN belongs to no company, and every in-app path to creating
 *     a user runs through CompanyGuard and refuses to assign a role the
 *     actor cannot manage — so nothing inside the running application can
 *     produce the first one.
 *
 * Both provisioning modes read the new user's password from ADMIN_PASSWORD,
 * or generate and print one once — never written to a file or echoed on a
 * second run.
 */
import "dotenv/config";
import {randomBytes} from "crypto";
import * as bcrypt from "bcrypt";
import {PrismaClient, UnitStatus, UnitType} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {RbacService} from "@/modules/rbac/rbac.service";
import {DEFAULT_ROLES} from "@/modules/rbac/default-role-permissions";

const prisma = new PrismaClient({
    adapter: new PrismaPg({connectionString: process.env.DATABASE_URL!}),
});

function fail(message: string): never {
    console.error(`\n  seed: ${message}\n`);
    process.exit(1);
}

/**
 * RbacService.seedDefaultRolesIfMissing() only assigns permissions to a
 * default role it creates itself — it treats a role that already exists
 * (by companyId+name) as already fully seeded and never touches it again,
 * by design (see its own docstring). But the system Role rows for all five
 * default roles are also created directly by the
 * 20260917051144_remove_user_role_enum migration, with no permissions at
 * all, to backfill roleId for pre-existing users. On any database that ran
 * that migration, seedDefaultRolesIfMissing() finds those rows already
 * present and skips them — so a role provisioned this way is stuck with
 * zero permissions until something explicitly assigns them.
 *
 * This does that: for each default role, add whatever of its catalog
 * permissions aren't already attached. It's additive only (skipDuplicates),
 * so it never strips a permission a platform administrator has since
 * removed from one of these roles — it only fills in what's missing.
 */
async function ensureDefaultRolePermissions(prisma: PrismaClient): Promise<void> {
    for (const seed of DEFAULT_ROLES) {
        if (seed.permissionKeys.length === 0) continue;

        const role = await prisma.role.findFirst({
            where: {companyId: null, name: seed.name},
            select: {id: true},
        });

        if (!role) continue;

        const permissions = await prisma.permission.findMany({
            where: {key: {in: seed.permissionKeys}},
            select: {id: true},
        });

        await prisma.rolePermission.createMany({
            data: permissions.map((p) => ({roleId: role.id, permissionId: p.id})),
            skipDuplicates: true,
        });
    }
}

function parseFlags(argv: string[]): Map<string, string> {
    const flags = new Map<string, string>();

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;

        const key = token.slice(2);
        const value = argv[i + 1];

        if (value === undefined || value.startsWith("--")) {
            fail(`--${key} needs a value`);
        }

        flags.set(key, value);
        i += 1;
    }

    return flags;
}

/** 18 bytes of base64url — ~24 characters, no ambiguity about shell escaping. */
function generatePassword(): string {
    return randomBytes(18).toString("base64url");
}

function assertEmailLike(email: string, flagName: string): void {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        fail(`--${flagName} does not look like an email address: ${email}`);
    }
}

/**
 * Demo data for local development only.
 *
 * This inserts a fixed company, a project called "ЖК Орион", sample inventory
 * and an admin@crm.dev account whose password is password123. Running it
 * against a real deployment would hand anyone who knows this repository an
 * administrator login, so it refuses outside development.
 *
 * To create a real tenant use `--mode provision-tenant` instead.
 */
async function seedDemo() {
    const env = process.env.NODE_ENV;

    if (env === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
        fail(
            "refusing to run with NODE_ENV=production.\n" +
            "  This inserts demo data and a well-known admin password.\n" +
            "  Use `npx tsx prisma/seed.ts --mode provision-tenant` to create a real tenant.",
        );
    }

    // Same RBAC bootstrap RbacService runs on every API boot (permission
    // catalog, default roles) — run it here too, before creating the demo
    // admin below, so there's a real "Company Admin" Role row to point
    // roleId at even on a database that has never booted the app.
    const rbacService = new RbacService(prisma as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const companyAdminRole = await prisma.role.findFirstOrThrow({where: {isDefaultCompanyAdmin: true}});

    const passwordHash = await bcrypt.hash("password123", 10);

    const company = await prisma.company.upsert({
        where: {
            id: "local-company-id",
        },
        update: {},
        create: {
            id: "local-company-id",
            name: "Bishkek Dev",
            phone: "+996700000000",
            address: "Bishkek",
            timezone: "UTC+6",
            locale: "ky"
        },
    });

    await prisma.user.upsert({
        where: {
            email: "admin@crm.dev",
        },
        update: {},
        create: {
            fullName: "Admin User",
            email: "admin@crm.dev",
            phone: "+996700000001",
            passwordHash,
            roleId: companyAdminRole.id,
            companyId: company.id,
        },
    });

    const project = await prisma.project.create({
        data: {
            name: "ЖК Орион",
            address: "Бишкек",
            companyId: company.id,
        },
    });

    const block = await prisma.block.create({
        data: {
            name: "A",
            order: 1,
            projectId: project.id,
        },
    });

    const entrance = await prisma.entrance.create({
        data: {
            name: "1",
            order: 1,
            projectId: project.id,
            blockId: block.id,
        },
    });

    for (let floorNumber = 1; floorNumber <= 9; floorNumber++) {
        const floor = await prisma.floor.create({
            data: {
                number: floorNumber,
                order: floorNumber,
                projectId: project.id,
                blockId: block.id,
                entranceId: entrance.id,
            },
        });

        for (let unitIndex = 1; unitIndex <= 6; unitIndex++) {
            await prisma.unit.create({
                data: {
                    number: `${floorNumber}${unitIndex.toString().padStart(2, "0")}`,
                    type: UnitType.APARTMENT,
                    status: UnitStatus.AVAILABLE,
                    rooms: unitIndex % 3 === 0 ? 3 : unitIndex % 2 === 0 ? 2 : 1,
                    area: 42 + unitIndex * 4,
                    price: 42000 + unitIndex * 3500,
                    projectId: project.id,
                    blockId: block.id,
                    entranceId: entrance.id,
                    floorId: floor.id,
                },
            });
        }
    }

    console.log("Database seeded successfully");
    console.log("Admin login: admin@crm.dev");
    console.log("Admin password: password123");
}

/**
 * Creates one company and its first administrator. Nothing else.
 *
 * This exists because `--mode demo` above also inserts demo inventory and
 * an admin@crm.dev / password123 account — fine for local development,
 * catastrophic on a client's server.
 */
async function provisionTenant(flags: Map<string, string>) {
    const required = ["company", "admin-email", "admin-name"];
    const missing = required.filter((k) => !flags.get(k)?.trim());

    if (missing.length > 0) {
        fail(`missing required argument(s): ${missing.map((m) => "--" + m).join(", ")}`);
    }

    const adminEmail = flags.get("admin-email")!.trim().toLowerCase();
    assertEmailLike(adminEmail, "admin-email");

    const args = {
        company: flags.get("company")!.trim(),
        adminEmail,
        adminName: flags.get("admin-name")!.trim(),
        // Defaults chosen for the pilot market rather than left blank: a null
        // currency would fall back to a dollar sign in the UI.
        currency: flags.get("currency")?.trim() || "KGS",
        locale: flags.get("locale")?.trim() || "ru-RU",
        timezone: flags.get("timezone")?.trim() || "Asia/Bishkek",
    };

    const existingCompany = await prisma.company.findFirst({
        where: {name: args.company, deletedAt: null},
    });

    const company =
        existingCompany ??
        (await prisma.company.create({
            data: {
                name: args.company,
                currency: args.currency,
                locale: args.locale,
                timezone: args.timezone,
            },
        }));

    console.log(
        existingCompany
            ? `  company    reusing existing "${company.name}" (${company.id})`
            : `  company    created "${company.name}" (${company.id})`,
    );

    // Email is globally unique, so check across all companies — otherwise
    // the create below fails on a constraint with a much worse message.
    const existingUser = await prisma.user.findUnique({where: {email: args.adminEmail}});

    if (existingUser) {
        console.log(`  admin      ${args.adminEmail} already exists — password left unchanged`);

        if (existingUser.companyId !== company.id) {
            console.warn(`  WARNING    that account belongs to a different company (${existingUser.companyId})`);
        }

        console.log("\n  Nothing further to do.\n");
        return;
    }

    const password = process.env.ADMIN_PASSWORD?.trim() || generatePassword();
    const generated = !process.env.ADMIN_PASSWORD?.trim();

    if (password.length < 8) {
        fail("ADMIN_PASSWORD must be at least 8 characters");
    }

    // The "Company Admin" role may not exist yet — this can run against a
    // database that has never booted the app (and so never seeded it). Run
    // the same seeding RbacService runs on every boot, then look the role
    // up by its isDefaultCompanyAdmin marker rather than by name, since a
    // platform administrator may have renamed it.
    const rbacService = new RbacService(prisma as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const companyAdminRole = await prisma.role.findFirstOrThrow({where: {isDefaultCompanyAdmin: true}});

    await prisma.user.create({
        data: {
            fullName: args.adminName,
            email: args.adminEmail,
            passwordHash: await bcrypt.hash(password, 10),
            roleId: companyAdminRole.id,
            companyId: company.id,
        },
    });

    console.log(`  admin      created ${args.adminEmail} (COMPANY_ADMIN)`);
    console.log(`  settings   ${args.currency} · ${args.locale} · ${args.timezone}`);

    if (generated) {
        console.log(
            "\n  Generated password — shown once, not stored anywhere else:\n" +
            `\n      ${password}\n` +
            "\n  Give it to the administrator and have them change it at first login\n" +
            "  (PATCH /api/auth/me/password).\n",
        );
    } else {
        console.log("\n  Password taken from ADMIN_PASSWORD.\n");
    }
}

/** Creates the platform's first SUPER_ADMIN. */
async function provisionSuperAdmin(flags: Map<string, string>) {
    const email = flags.get("email")?.trim().toLowerCase();
    const name = flags.get("name")?.trim();

    if (!email || !name) fail("both --email and --name are required");
    assertEmailLike(email, "email");

    const existing = await prisma.user.findUnique({where: {email}, include: {role: true}});

    if (existing) {
        console.log(
            existing.isSuperAdmin
                ? `\n  ${email} is already a SUPER_ADMIN — password left unchanged.\n`
                : `\n  ${email} already exists with role ${existing.role.name}. Refusing to change it.\n`,
        );
        return;
    }

    const password = process.env.ADMIN_PASSWORD?.trim() || generatePassword();
    const generated = !process.env.ADMIN_PASSWORD?.trim();

    if (password.length < 8) fail("ADMIN_PASSWORD must be at least 8 characters");

    // The "Super Admin" role may not exist yet — this can run against a
    // database that has never booted the app (and so never seeded it). Run
    // the same seeding RbacService runs on every boot, then look the role
    // up by its isPlatformRole marker rather than by name, since a
    // platform administrator may have renamed it.
    const rbacService = new RbacService(prisma as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const superAdminRole = await prisma.role.findFirstOrThrow({where: {isPlatformRole: true}});

    await prisma.user.create({
        data: {
            fullName: name,
            email,
            passwordHash: await bcrypt.hash(password, 10),
            roleId: superAdminRole.id,
            isSuperAdmin: true,
            // No company, deliberately. CompanyGuard rejects a user without
            // one, which is what keeps this account out of tenant data.
            companyId: null,
        },
    });

    console.log(`\n  Created SUPER_ADMIN ${email}`);

    if (generated) {
        console.log(
            "\n  Generated password — shown once, not stored anywhere else:\n" +
            `\n      ${password}\n` +
            "\n  Change it at first login (PATCH /api/auth/me/password).\n",
        );
    } else {
        console.log("\n  Password taken from ADMIN_PASSWORD.\n");
    }
}

async function main() {
    if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");

    const flags = parseFlags(process.argv.slice(2));
    const mode = flags.get("mode") ?? "demo";

    switch (mode) {
        case "demo":
            return seedDemo();
        case "provision-tenant":
            return provisionTenant(flags);
        case "provision-super-admin":
            return provisionSuperAdmin(flags);
        default:
            fail(`unknown --mode "${mode}" (expected demo, provision-tenant, or provision-super-admin)`);
    }
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

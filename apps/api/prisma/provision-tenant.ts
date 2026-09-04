/**
 * Creates one company and its first administrator. Nothing else.
 *
 * This exists because the only way to get a working tenant was prisma/seed.ts,
 * which also inserts demo inventory and an admin@crm.dev / password123 account
 * — fine for local development, catastrophic on a client's server.
 *
 * Idempotent: run it twice and the second run reports what already exists
 * rather than creating duplicates or resetting a password someone is using.
 *
 *   npx tsx prisma/provision-tenant.ts \
 *     --company "Bishkek Dev" \
 *     --admin-email admin@bishkekdev.kg \
 *     --admin-name "Aibek Kendirbaev" \
 *     [--currency KGS] [--locale ru-RU] [--timezone Asia/Bishkek]
 *
 * The password is read from ADMIN_PASSWORD, or generated and printed once if
 * that is unset. It is never written to a file or echoed on a second run.
 */
import "dotenv/config";
import {randomBytes} from "crypto";
import * as bcrypt from "bcrypt";
import {PrismaClient, UserRole} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";

type Args = {
    company: string;
    adminEmail: string;
    adminName: string;
    currency: string;
    locale: string;
    timezone: string;
};

function parseArgs(argv: string[]): Args {
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

    const required = ["company", "admin-email", "admin-name"];
    const missing = required.filter((k) => !flags.get(k)?.trim());

    if (missing.length > 0) {
        fail(`missing required argument(s): ${missing.map((m) => "--" + m).join(", ")}`);
    }

    const adminEmail = flags.get("admin-email")!.trim().toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
        fail(`--admin-email does not look like an email address: ${adminEmail}`);
    }

    return {
        company: flags.get("company")!.trim(),
        adminEmail,
        adminName: flags.get("admin-name")!.trim(),
        // Defaults chosen for the pilot market rather than left blank: a null
        // currency would fall back to a dollar sign in the UI.
        currency: flags.get("currency")?.trim() || "KGS",
        locale: flags.get("locale")?.trim() || "ru-RU",
        timezone: flags.get("timezone")?.trim() || "Asia/Bishkek",
    };
}

function fail(message: string): never {
    console.error(`\n  provision-tenant: ${message}\n`);
    process.exit(1);
}

/** 18 bytes of base64url — ~24 characters, no ambiguity about shell escaping. */
function generatePassword(): string {
    return randomBytes(18).toString("base64url");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!process.env.DATABASE_URL) {
        fail("DATABASE_URL is not set");
    }

    const prisma = new PrismaClient({
        adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}),
    });

    try {
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

        await prisma.user.create({
            data: {
                fullName: args.adminName,
                email: args.adminEmail,
                passwordHash: await bcrypt.hash(password, 10),
                role: UserRole.COMPANY_ADMIN,
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
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("\n  provision-tenant failed:", error instanceof Error ? error.message : error, "\n");
    process.exit(1);
});

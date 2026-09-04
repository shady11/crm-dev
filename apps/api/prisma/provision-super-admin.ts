/**
 * Creates the platform's first SUPER_ADMIN.
 *
 * This has to be a script: a SUPER_ADMIN belongs to no company, and every
 * in-app path to creating a user runs through CompanyGuard and refuses to
 * assign a role the actor cannot manage. So nothing inside the running
 * application can produce the first one.
 *
 *   npx tsx prisma/provision-super-admin.ts \
 *     --email ops@yourdomain.kg --name "Aibek Kendirbaev"
 *
 * Password comes from ADMIN_PASSWORD, or is generated and printed once.
 */
import "dotenv/config";
import {randomBytes} from "crypto";
import * as bcrypt from "bcrypt";
import {PrismaClient, UserRole} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";

function fail(message: string): never {
    console.error(`\n  provision-super-admin: ${message}\n`);
    process.exit(1);
}

function parseArgs(argv: string[]) {
    const flags = new Map<string, string>();

    for (let i = 0; i < argv.length; i += 1) {
        if (!argv[i].startsWith("--")) continue;
        const key = argv[i].slice(2);
        const value = argv[i + 1];
        if (value === undefined || value.startsWith("--")) fail(`--${key} needs a value`);
        flags.set(key, value);
        i += 1;
    }

    const email = flags.get("email")?.trim().toLowerCase();
    const name = flags.get("name")?.trim();

    if (!email || !name) fail("both --email and --name are required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`--email does not look like an email address: ${email}`);

    return {email, name};
}

async function main() {
    const {email, name} = parseArgs(process.argv.slice(2));

    if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");

    const prisma = new PrismaClient({
        adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}),
    });

    try {
        const existing = await prisma.user.findUnique({where: {email}});

        if (existing) {
            console.log(
                existing.role === UserRole.SUPER_ADMIN
                    ? `\n  ${email} is already a SUPER_ADMIN — password left unchanged.\n`
                    : `\n  ${email} already exists with role ${existing.role}. Refusing to change it.\n`,
            );
            return;
        }

        const password = process.env.ADMIN_PASSWORD?.trim() || randomBytes(18).toString("base64url");
        const generated = !process.env.ADMIN_PASSWORD?.trim();

        if (password.length < 8) fail("ADMIN_PASSWORD must be at least 8 characters");

        await prisma.user.create({
            data: {
                fullName: name,
                email,
                passwordHash: await bcrypt.hash(password, 10),
                role: UserRole.SUPER_ADMIN,
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
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("\n  provision-super-admin failed:", error instanceof Error ? error.message : error, "\n");
    process.exit(1);
});

// Password - WGOKtJty8E8-rJRPdENbtZrE

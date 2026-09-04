import "dotenv/config";
import {PrismaClient, UnitStatus, UnitType, UserRole,} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
    adapter,
});

/**
 * Demo data for local development only.
 *
 * This inserts a fixed company, a project called "ЖК Орион", sample inventory
 * and an admin@crm.dev account whose password is password123. Running it
 * against a real deployment would hand anyone who knows this repository an
 * administrator login, so it refuses outside development.
 *
 * To create a real tenant use prisma/provision-tenant.ts instead.
 */
function assertNotProduction() {
    const env = process.env.NODE_ENV;

    if (env === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
        console.error(
            "\n  seed: refusing to run with NODE_ENV=production.\n" +
            "  This inserts demo data and a well-known admin password.\n" +
            "  Use `npx tsx prisma/provision-tenant.ts` to create a real tenant.\n",
        );
        process.exit(1);
    }
}

async function main() {
    assertNotProduction();

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
            role: UserRole.COMPANY_ADMIN,
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

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
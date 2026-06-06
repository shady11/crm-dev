import "dotenv/config";
import { PrismaClient, UserRole, ApartmentStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
    adapter,
});

async function main() {
    const passwordHash = await bcrypt.hash("password123", 10);

    const company = await prisma.company.upsert({
        where: {
            id: "local-company-id",
        },
        update: {},
        create: {
            id: "local-company-id",
            name: "BishkekStroy",
            phone: "+996700000000",
            address: "Bishkek",
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
            name: "Блок A",
            projectId: project.id,
        },
    });

    for (let floor = 1; floor <= 9; floor++) {
        for (let number = 1; number <= 6; number++) {
            await prisma.apartment.create({
                data: {
                    number: `${floor}${number.toString().padStart(2, "0")}`,
                    floor,
                    rooms: number % 3 === 0 ? 3 : number % 2 === 0 ? 2 : 1,
                    square: 42 + number * 4,
                    price: 42000 + number * 3500,
                    status:
                        number === 2
                            ? ApartmentStatus.BOOKED
                            : number === 4
                                ? ApartmentStatus.SOLD
                                : ApartmentStatus.AVAILABLE,
                    projectId: project.id,
                    blockId: block.id,
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
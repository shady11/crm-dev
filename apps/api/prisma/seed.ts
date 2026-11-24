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
import * as bcrypt from "bcrypt";
import {
    ActivityAction,
    ActivityType,
    BlockSalesStatus,
    DealStatus,
    DiscountApprovalStatus,
    FinancingType,
    LeadLostReason,
    LeadStatus,
    PaymentMethod,
    PaymentScheduleStatus,
    PaymentType,
    PrismaClient,
    ProjectStatus,
    TaskStatus,
    UnitPriceRequestStatus,
    UnitStatus,
    UnitType,
} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {RbacService} from "@/modules/rbac/rbac.service";
import {DEFAULT_ROLES} from "@/modules/rbac/default-role-permissions";
import {numberUnnumberedPayments} from "@/modules/deals/services/payments/receipt-number.service";
import {activityText} from "@/modules/activities/activity-templates";
import {generateStrongPassword, isStrongPassword} from "@/common/constants/password-policy.constants";

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

// SA-12: what `--help` prints (`npm run provision -- --help`).
const USAGE = `Usage:
  npx tsx prisma/seed.ts
      Local demo data (admin@crm.dev / password123). Development only.

  npx tsx prisma/seed.ts --mode provision-tenant \\
      --company "Bishkek Dev" --admin-email admin@bishkekdev.kg --admin-name "Aibek Kendirbaev" \\
      [--currency KGS] [--locale ru-RU] [--timezone Asia/Bishkek]
      Creates one company and its first administrator.

  npx tsx prisma/seed.ts --mode provision-super-admin --email ops@yourdomain.kg --name "Aibek Kendirbaev"
      Creates the platform's first administrator.

The new user's password comes from ADMIN_PASSWORD, or is generated and printed once.
They are asked to change it when they first sign in.
`;

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
// SA-6: the same rule and generator as the app, so the first admin's
// password is never weaker than their staff's.
const generatePassword = generateStrongPassword;

function assertEmailLike(email: string, flagName: string): void {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        fail(`--${flagName} does not look like an email address: ${email}`);
    }
}

// --- Demo-data generators -------------------------------------------------
// Deterministic-ish helpers for the realistic sample data seedDemo() creates
// below (branches, users per role, leads, clients, deals, payments, tasks).
// Not cryptographically random — this is fixture data, not secrets.

// Kyrgyz names in Cyrillic, as a Bishkek sales team would type them. Surnames
// are stored in their masculine form; a woman's takes the feminine ending
// (Жумабеков → Жумабекова), so the first name and surname always agree.
const MALE_FIRST_NAMES = [
    "Айбек", "Нурлан", "Бакыт", "Эрмек", "Талант", "Руслан", "Марат", "Тилек",
    "Азамат", "Канат", "Улан", "Бекзат", "Нурбек", "Эрлан", "Мирлан", "Дастан",
];
const FEMALE_FIRST_NAMES = [
    "Айдана", "Чолпон", "Гүлнара", "Зарина", "Айзада", "Назира", "Эльвира", "Сабина",
    "Динара", "Мээрим", "Айгерим", "Насиба", "Жылдыз", "Бермет", "Асель", "Нургүл",
];
const SURNAMES = [
    "Жумабеков", "Садыков", "Токтогулов", "Исаев", "Бекболотов", "Молдалиев",
    "Кадыров", "Асанов", "Ташиев", "Орозов", "Байышев", "Джумалиев",
    "Кыдыров", "Султанов", "Рысбеков", "Мамытов", "Турганбаев", "Алиев",
    "Осмонов", "Абдыкадыров", "Сыдыков", "Эшимов", "Бообеков", "Шамшиев",
];

function personName(seed: number): string {
    const female = seed % 2 === 1;
    const firstNames = female ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
    const first = firstNames[Math.floor(seed / 2) % firstNames.length];
    const surname = SURNAMES[(seed * 7) % SURNAMES.length];
    return `${first} ${female ? `${surname}а` : surname}`;
}

function pick<T>(items: T[], seed: number): T {
    return items[seed % items.length];
}

function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function monthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
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
    const rbacService = new RbacService(prisma as never, undefined as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const companyAdminRole = await prisma.role.findFirstOrThrow({where: {isDefaultCompanyAdmin: true}});

    const passwordHash = await bcrypt.hash("password123", 10);

    // Legal details filled in, so the dashboard's setup checklist is complete
    // and contracts and receipts can be generated straight away. All of it is
    // invented: the tax ID and bank account are not real ones.
    const companyDetails = {
        name: "Bishkek Dev",
        phone: "+996 312 900 100",
        address: "Бишкек ш., Чүй пр., 150, 4-кабат",
        currency: "KGS",
        timezone: "Asia/Bishkek",
        locale: "ky-KG",
        legalName: "«Бишкек Дев Курулуш» ЖЧК",
        taxId: "02405202610015",
        signatoryName: "Осмонов Азамат Бакытович",
        signatoryTitle: "Башкы директор",
        bankName: "«Демо Банк» ААК",
        bankAccount: "1240020001234567",
        bankBic: "124002",
    };

    const company = await prisma.company.upsert({
        where: {
            id: "local-company-id",
        },
        update: companyDetails,
        create: {
            id: "local-company-id",
            ...companyDetails,
        },
    });

    await prisma.user.upsert({
        where: {
            email: "admin@crm.dev",
        },
        update: {},
        create: {
            fullName: "Азамат Осмонов",
            email: "admin@crm.dev",
            phone: "+996700000001",
            passwordHash,
            roleId: companyAdminRole.id,
            companyId: company.id,
        },
    });

    // Re-running the seed used to add another copy of the demo project every
    // time. Inventory, like the rest of the demo data, is created once.
    const existingProjects = await prisma.project.count({where: {companyId: company.id}});
    if (existingProjects > 0) {
        console.log("Demo projects already present — skipping inventory and sales data.");
    } else {
        const units = await seedDemoInventory(company.id);
        await seedDemoTenantData({company, units});
    }

    console.log("Database seeded successfully");
    console.log("Admin login: admin@crm.dev");
    console.log("Admin password: password123");
}

type DemoProjectKey = "orion" | "tooShamaly" | "jashylBak";

type DemoUnit = {
    id: string;
    price: number;
    projectId: string;
    project: DemoProjectKey;
    // False for units in a block whose sales haven't opened yet, which
    // refuses bookings (ensureBlockOpenForSales).
    bookable: boolean;
};

type UnitLayout = {type: UnitType; rooms?: number; area: number};

const apartment = (rooms: number, area: number): UnitLayout => ({type: UnitType.APARTMENT, rooms, area});
const commercial = (area: number): UnitLayout => ({type: UnitType.COMMERCIAL, area});

type DemoBlock = {
    name: string;
    salesStatus: BlockSalesStatus;
    completionDate?: Date;
    floors: number;
    // The units on a floor, in door order. A function of the floor number,
    // so the ground floor can hold shops instead of flats.
    layout: (floor: number) => UnitLayout[];
};

type DemoProject = {
    key: DemoProjectKey;
    name: string;
    address: string;
    status: ProjectStatus;
    handoverDate: Date;
    // Base list price per m², in som. Bishkek new builds sell for roughly
    // 90–130 thousand som per m²; Osh for less.
    pricePerSqm: number;
    blocks: DemoBlock[];
};

/**
 * List price for one unit: base price per m², plus 1% per floor above the
 * first (views and quiet), a ground-floor flat 5% cheaper, and commercial
 * space at a 40% premium. Rounded to the nearest 10,000 som, as a developer's
 * price list would be.
 */
function demoUnitPrice(project: DemoProject, layout: UnitLayout, floor: number): number {
    const floorFactor = layout.type === UnitType.COMMERCIAL ? 1.4 : floor === 1 ? 0.95 : 1 + (floor - 1) * 0.01;
    return Math.round((layout.area * project.pricePerSqm * floorFactor) / 10_000) * 10_000;
}

const DEMO_PROJECTS: DemoProject[] = [
    {
        key: "orion",
        name: "ЖК Орион",
        address: "Бишкек ш., Ахунбаев көч., 98",
        status: ProjectStatus.ACTIVE,
        handoverDate: new Date("2027-12-20"),
        pricePerSqm: 105_000,
        blocks: [
            {
                name: "A",
                salesStatus: BlockSalesStatus.ON_SALE,
                completionDate: new Date("2027-09-30"),
                floors: 9,
                layout: () => [apartment(1, 42), apartment(2, 58), apartment(3, 82), apartment(1, 45), apartment(2, 62), apartment(3, 86)],
            },
            {
                name: "B",
                salesStatus: BlockSalesStatus.ON_SALE,
                completionDate: new Date("2027-12-20"),
                floors: 12,
                layout: (floor) => floor === 1
                    ? [commercial(95), commercial(120), commercial(150)]
                    : [apartment(1, 40), apartment(2, 64), apartment(2, 68), apartment(3, 90)],
            },
        ],
    },
    {
        key: "tooShamaly",
        name: "ЖК Тоо Шамалы",
        address: "Бишкек ш., Жал кичи району, 31",
        // Off-plan pre-sales: bookable, construction not started.
        status: ProjectStatus.PLANNING,
        handoverDate: new Date("2028-09-30"),
        pricePerSqm: 89_000,
        blocks: [
            {
                name: "1",
                salesStatus: BlockSalesStatus.ON_SALE,
                completionDate: new Date("2028-06-30"),
                floors: 14,
                layout: () => [apartment(1, 38), apartment(2, 56), apartment(2, 61), apartment(3, 78)],
            },
            {
                // Second phase, released for sale later: shows the "sales not
                // open yet" state on the chessboard and the unit sheet.
                name: "2",
                salesStatus: BlockSalesStatus.UPCOMING,
                completionDate: new Date("2028-09-30"),
                floors: 10,
                layout: () => [apartment(1, 38), apartment(2, 56), apartment(2, 61), apartment(3, 78)],
            },
        ],
    },
    {
        key: "jashylBak",
        name: "ЖК Жашыл Бак",
        address: "Ош ш., Масалиев пр., 12",
        // Built and handed over; the last flats are still on sale.
        status: ProjectStatus.COMPLETED,
        handoverDate: new Date("2025-12-20"),
        pricePerSqm: 72_000,
        blocks: [
            {
                name: "A",
                salesStatus: BlockSalesStatus.COMPLETED,
                completionDate: new Date("2025-12-20"),
                floors: 6,
                layout: () => [apartment(1, 44), apartment(2, 63), apartment(3, 85), apartment(2, 66)],
            },
        ],
    },
];

/**
 * Three projects at different stages: one under construction and on sale,
 * one sold off-plan with a second phase not yet released, and one finished
 * in Osh with its last flats left. Each unit's number is its floor and door
 * (`905` is floor 9, door 5), unique within its block.
 */
async function seedDemoInventory(companyId: string): Promise<DemoUnit[]> {
    const units: DemoUnit[] = [];

    for (const spec of DEMO_PROJECTS) {
        const project = await prisma.project.create({
            data: {
                name: spec.name,
                address: spec.address,
                status: spec.status,
                handoverDate: spec.handoverDate,
                companyId,
            },
        });

        for (const [blockIndex, blockSpec] of spec.blocks.entries()) {
            const block = await prisma.block.create({
                data: {
                    name: blockSpec.name,
                    order: blockIndex + 1,
                    salesStatus: blockSpec.salesStatus,
                    completionDate: blockSpec.completionDate,
                    projectId: project.id,
                },
            });

            const entrance = await prisma.entrance.create({
                data: {name: "1", order: 1, projectId: project.id, blockId: block.id},
            });

            for (let floorNumber = 1; floorNumber <= blockSpec.floors; floorNumber++) {
                const floor = await prisma.floor.create({
                    data: {
                        number: floorNumber,
                        order: floorNumber,
                        projectId: project.id,
                        blockId: block.id,
                        entranceId: entrance.id,
                    },
                });

                for (const [doorIndex, layout] of blockSpec.layout(floorNumber).entries()) {
                    const price = demoUnitPrice(spec, layout, floorNumber);
                    const unit = await prisma.unit.create({
                        data: {
                            number: `${floorNumber}${String(doorIndex + 1).padStart(2, "0")}`,
                            type: layout.type,
                            status: UnitStatus.AVAILABLE,
                            rooms: layout.rooms,
                            area: layout.area,
                            price,
                            projectId: project.id,
                            blockId: block.id,
                            entranceId: entrance.id,
                            floorId: floor.id,
                        },
                    });
                    units.push({
                        id: unit.id,
                        price,
                        projectId: project.id,
                        project: spec.key,
                        bookable: blockSpec.salesStatus !== BlockSalesStatus.UPCOMING,
                    });
                }
            }
        }
    }

    return units;
}

/**
 * The same units in a fixed but scattered order, so sold and booked units
 * spread across floors on the chessboard instead of filling floor 1 first.
 */
function scatter<T>(items: T[]): T[] {
    return items
        .map((item, i) => ({item, key: (i * 2654435761) % 4294967296}))
        .sort((a, b) => a.key - b.key)
        .map(({item}) => item);
}

/**
 * Branches, per-role users, leads, clients, deals (with payment schedules
 * and payments), tasks, and a handful of activity-feed rows — enough for
 * the four role dashboards (Company Admin, Sales Head, Sales Manager,
 * Finance) to render non-empty charts on a fresh local database. Skipped if
 * the demo company already has branches, so re-running the seed doesn't
 * pile up duplicate leads/deals every time.
 */
async function seedDemoTenantData(args: {
    company: {id: string};
    units: DemoUnit[];
}) {
    const {company, units} = args;

    const existingBranchCount = await prisma.branch.count({where: {companyId: company.id}});
    if (existingBranchCount > 0) {
        console.log("Extended demo data already present — skipping.");
        return;
    }

    const [salesHeadRole, salesManagerRole, financeRole] = await Promise.all([
        prisma.role.findFirstOrThrow({where: {companyId: null, name: "Sales Head"}}),
        prisma.role.findFirstOrThrow({where: {companyId: null, name: "Sales Manager"}}),
        prisma.role.findFirstOrThrow({where: {companyId: null, name: "Finance"}}),
    ]);

    const passwordHash = await bcrypt.hash("password123", 10);

    const branches = await Promise.all([
        prisma.branch.create({
            data: {companyId: company.id, name: "Бишкек, борбордук кеңсе", city: "Бишкек", address: "Чүй пр., 150", phone: "+996700000010"},
        }),
        prisma.branch.create({
            data: {companyId: company.id, name: "Ош филиалы", city: "Ош", address: "Ленин көч., 45", phone: "+996700000011"},
        }),
    ]);

    const financeUser = await prisma.user.create({
        data: {
            fullName: "Нургүл Бактыбекова",
            email: "finance@crm.dev",
            phone: "+996700000020",
            passwordHash,
            roleId: financeRole.id,
            companyId: company.id,
        },
    });

    type BranchTeam = {branchId: string; head: {id: string; fullName: string}; managers: {id: string; fullName: string}[]};
    const teams: BranchTeam[] = [];

    for (const [branchIndex, branch] of branches.entries()) {
        const headName = personName(branchIndex * 11 + 1);
        const head = await prisma.user.create({
            data: {
                fullName: headName,
                email: `sales.head.${branchIndex + 1}@crm.dev`,
                phone: `+9967000001${branchIndex + 2}`,
                passwordHash,
                roleId: salesHeadRole.id,
                companyId: company.id,
                branchId: branch.id,
            },
        });

        const managers: {id: string; fullName: string}[] = [];
        for (let m = 0; m < 2; m++) {
            const seed = branchIndex * 11 + m + 2;
            const managerName = personName(seed);
            const manager = await prisma.user.create({
                data: {
                    fullName: managerName,
                    email: `sales.manager.${branchIndex + 1}.${m + 1}@crm.dev`,
                    phone: `+99670000${(branchIndex + 1)}${(m + 1)}0`,
                    passwordHash,
                    roleId: salesManagerRole.id,
                    companyId: company.id,
                    branchId: branch.id,
                },
            });
            managers.push({id: manager.id, fullName: manager.fullName});
        }

        teams.push({branchId: branch.id, head: {id: head.id, fullName: head.fullName}, managers});
    }

    // --- Clients (13 per branch) -------------------------------------
    const clients: {id: string; branchId: string; fullName: string}[] = [];
    for (const team of teams) {
        for (let c = 0; c < 13; c++) {
            const seed = clients.length + 100;
            const client = await prisma.client.create({
                data: {
                    fullName: personName(seed),
                    phone: `+9967001${String(seed).padStart(5, "0")}`,
                    email: `client${seed}@example.com`,
                    // Signing a contract needs both. Every fifth client is
                    // left without them to show the "add the client's
                    // details first" path.
                    ...(seed % 5 === 0
                        ? {}
                        : {passport: `AN${String(1000000 + seed)}`, pin: `2${String(seed).padStart(13, "0")}`}),
                    companyId: company.id,
                    branchId: team.branchId,
                },
            });
            clients.push({id: client.id, branchId: team.branchId, fullName: client.fullName});
        }
    }

    // --- Leads (22 per branch, every status represented) --------------
    const leadStatuses = Object.values(LeadStatus);
    // OTHER needs a note, so the seed sticks to the named reasons.
    const lostReasons = Object.values(LeadLostReason).filter((reason) => reason !== LeadLostReason.OTHER);
    const leadSources = ["Website", "Instagram", "Referral", "Walk-in", "Phone"];
    const projectIds = [...new Set(units.map((u) => u.projectId))];
    let leadSeed = 0;

    for (const team of teams) {
        const branchClients = clients.filter((c) => c.branchId === team.branchId);

        for (let l = 0; l < 22; l++) {
            const status = pick(leadStatuses, leadSeed);
            const manager = pick(team.managers, leadSeed);
            const isConverted = status === LeadStatus.CONVERTED;
            const linkedClient = isConverted ? branchClients[l % branchClients.length] : undefined;

            await prisma.lead.create({
                data: {
                    fullName: personName(leadSeed + 500),
                    phone: `+9967002${String(leadSeed).padStart(5, "0")}`,
                    email: leadSeed % 2 === 0 ? `lead${leadSeed}@example.com` : undefined,
                    source: pick(leadSources, leadSeed),
                    status,
                    companyId: company.id,
                    branchId: team.branchId,
                    createdById: team.head.id,
                    managerId: manager.id,
                    clientId: linkedClient?.id,
                    nextContactAt: status === LeadStatus.LOST || isConverted ? undefined : daysFromNow((leadSeed % 10) - 3),
                    ...(status === LeadStatus.LOST
                        ? {lostReason: pick(lostReasons, leadSeed), lostAt: monthsAgo(0)}
                        : {}),
                    lastContactAt: monthsAgo(0),
                    assignedAt: monthsAgo(1),
                    // Qualification on most leads; every fourth left blank, as
                    // a freshly logged call would be.
                    ...(leadSeed % 4 === 3
                        ? {}
                        : {
                              // 4.0–8.8 million som: a one- to three-room flat.
                              budget: 4_000_000 + (leadSeed % 5) * 1_200_000,
                              rooms: 1 + (leadSeed % 3),
                              preferredProjectId: pick(projectIds, leadSeed),
                              financingType: pick(Object.values(FinancingType), leadSeed),
                          }),
                },
            });
            leadSeed += 1;
        }
    }

    // --- Deals, payment schedules and payments -------------------------
    // Which project each deal is on, in order. The finished Osh project is
    // mostly paid-up sales; the off-plan one has bookings and fresh contracts.
    const O: DemoProjectKey = "orion", T: DemoProjectKey = "tooShamaly", J: DemoProjectKey = "jashylBak";
    const dealPlan: {status: DealStatus; projects: DemoProjectKey[]}[] = [
        {status: DealStatus.RESERVED, projects: [O, O, T, O, T, O]},
        {status: DealStatus.CONTRACT_SIGNED, projects: [O, T, O, T, O]},
        {status: DealStatus.ACTIVE, projects: [O, O, T, O, J, O, T]},
        {status: DealStatus.COMPLETED, projects: [J, J, J, J, J, J, J, J, J, J, O, O]},
        {status: DealStatus.CANCELLED, projects: [O, T]},
        {status: DealStatus.EXPIRED, projects: [O]},
    ];
    const unitPools = new Map<DemoProjectKey, DemoUnit[]>(
        (["orion", "tooShamaly", "jashylBak"] as const).map((key) => [
            key,
            scatter(units.filter((u) => u.project === key && u.bookable)),
        ]),
    );
    const takeUnit = (key: DemoProjectKey): DemoUnit => {
        const unit = unitPools.get(key)!.shift();
        if (!unit) throw new Error(`seed: ran out of units in ${key}`);
        return unit;
    };

    const financingTypes = Object.values(FinancingType);
    const paymentMethods = Object.values(PaymentMethod);

    let dealSeq = 1;
    let dealSeed = 0;

    for (const {status, projects} of dealPlan) {
        for (const [i, projectKey] of projects.entries()) {
            const unit = takeUnit(projectKey);
            // Osh sells the Osh project; Bishkek projects go to either branch.
            const team = projectKey === "jashylBak" ? teams[1] : teams[dealSeed % teams.length];
            const manager = pick(team.managers, dealSeed);
            const branchClients = clients.filter((c) => c.branchId === team.branchId);
            const client = branchClients[dealSeed % branchClients.length];

            const listPrice = unit.price;
            const hasDiscount = dealSeed % 8 === 0;
            const discountPercent = hasDiscount ? 8 : undefined;
            const salePrice = hasDiscount ? Math.round(listPrice * (1 - discountPercent! / 100)) : listPrice;
            // Some reservations are seeded already past their expiry, for the
            // "Reservations expiring" list; the expiry job turns them EXPIRED.
            const reservationLapsed = status === DealStatus.RESERVED && dealSeed % 5 === 0;
            // Taken at booking, as the booking form does. Reservations that
            // ended cancelled or expired took one too: the first cancelled deal
            // and the expired one have it refunded, the other cancelled deal
            // still holds it, to show the "money held" banner. Reservations
            // seeded to lapse get none, since the expiry job closes them later.
            const takesDeposit = !reservationLapsed;
            const depositRefunded = (status === DealStatus.CANCELLED && i === 0) || status === DealStatus.EXPIRED;
            const deposit = takesDeposit ? Math.round(salePrice * 0.15) : 0;

            // CONTRACT_SIGNED deals are recent and hold only the deposit.
            // ACTIVE ones are 3-6 months into a 6-month schedule, so they mix
            // paid, overdue and upcoming installments. COMPLETED ones started
            // long enough ago that every installment fell due in the past.
            const createdAt = monthsAgo(
                status === DealStatus.RESERVED ? 0 :
                status === DealStatus.CONTRACT_SIGNED ? 1 :
                status === DealStatus.COMPLETED ? 8 + (dealSeed % 4) :
                3 + (dealSeed % 4),
            );

            const deal = await prisma.deal.create({
                data: {
                    companyId: company.id,
                    projectId: unit.projectId,
                    unitId: unit.id,
                    clientId: client.id,
                    managerId: manager.id,
                    branchId: team.branchId,
                    dealNumber: `D-${new Date().getFullYear()}-${String(dealSeq).padStart(4, "0")}`,
                    status,
                    financingType: pick(financingTypes, dealSeed),
                    listPrice,
                    salePrice,
                    discountAmount: hasDiscount ? listPrice - salePrice : undefined,
                    discountPercent,
                    deposit,
                    discountApprovalStatus: hasDiscount ? DiscountApprovalStatus.APPROVED : DiscountApprovalStatus.NONE,
                    discountApprovedById: hasDiscount ? team.head.id : undefined,
                    discountApprovedAt: hasDiscount ? createdAt : undefined,
                    reservedAt: createdAt,
                    reservedById: manager.id,
                    reservationExpiresAt: status === DealStatus.RESERVED ? daysFromNow(reservationLapsed ? -1 : 2) : undefined,
                    contractNumber: status === DealStatus.CONTRACT_SIGNED || status === DealStatus.ACTIVE || status === DealStatus.COMPLETED
                        ? `CN-${dealSeq}` : undefined,
                    contractDate: status === DealStatus.CONTRACT_SIGNED || status === DealStatus.ACTIVE || status === DealStatus.COMPLETED
                        ? createdAt : undefined,
                    cancelledAt: status === DealStatus.CANCELLED ? monthsAgo(1) : undefined,
                    cancelReason: status === DealStatus.CANCELLED ? "Кардар баш тартты: ипотека бекитилген жок" : undefined,
                    createdAt,
                },
            });

            const unitStatus =
                status === DealStatus.RESERVED ? UnitStatus.RESERVED :
                status === DealStatus.CANCELLED || status === DealStatus.EXPIRED ? UnitStatus.AVAILABLE :
                UnitStatus.SOLD;
            await prisma.unit.update({where: {id: unit.id}, data: {status: unitStatus}});

            await prisma.activity.create({
                data: {
                    // What the app logs when a deal opens: its reservation.
                    action: ActivityAction.RESERVED_UNIT,
                    type: ActivityType.UNIT_RESERVED,
                    ...activityText('unitReserved'),
                    companyId: company.id,
                    userId: manager.id,
                    dealId: deal.id,
                    clientId: client.id,
                    createdAt,
                },
            });

            const recordPayment = async (amount: number, paymentType: PaymentType, paidAt: Date, order: number) => {
                await prisma.payment.create({
                    data: {
                        dealId: deal.id,
                        userId: manager.id,
                        amount,
                        paymentMethod: pick(paymentMethods, dealSeed + order),
                        paymentType,
                        paidAt,
                        reference: `PMT-${dealSeq}-${order}`,
                    },
                });
                await prisma.activity.create({
                    data: {
                        action: ActivityAction.RECEIVED_PAYMENT,
                        type: ActivityType.PAYMENT_RECEIVED,
                        ...activityText('paymentReceived'),
                        companyId: company.id,
                        userId: manager.id,
                        dealId: deal.id,
                        createdAt: paidAt,
                    },
                });
            };

            if (deposit > 0) {
                await recordPayment(deposit, PaymentType.DEPOSIT, createdAt, 0);
            }
            // Money is taken before activation too (FIN-9): every other
            // signed contract has its first payment, made at signing.
            if (status === DealStatus.CONTRACT_SIGNED && dealSeed % 2 === 1) {
                await recordPayment(Math.round(salePrice * 0.1), PaymentType.INSTALLMENT, createdAt, 1);
            }

            if (deposit > 0 && depositRefunded) {
                const refundedAt = status === DealStatus.CANCELLED ? monthsAgo(1) : createdAt;
                await prisma.payment.create({
                    data: {
                        dealId: deal.id,
                        userId: financeUser.id,
                        amount: -deposit,
                        paymentMethod: PaymentMethod.BANK_TRANSFER,
                        paymentType: PaymentType.REFUND,
                        paidAt: refundedAt,
                        reference: `RFD-${dealSeq}`,
                    },
                });
                await prisma.activity.create({
                    data: {
                        action: ActivityAction.RECEIVED_PAYMENT,
                        type: ActivityType.PAYMENT_REFUNDED,
                        ...activityText('refundIssued'),
                        companyId: company.id,
                        userId: financeUser.id,
                        dealId: deal.id,
                        createdAt: refundedAt,
                    },
                });
            }

            // The app only generates a schedule once a deal is ACTIVE, and
            // splits what's left after the deposit the way
            // PaymentScheduleService does: equal shares rounded down to two
            // decimals, the remainder on the last one, so the rows add up to
            // the sale price exactly.
            if (status === DealStatus.ACTIVE || status === DealStatus.COMPLETED) {
                const installmentCount = 6;
                const remainingCents = Math.round((salePrice - deposit) * 100);
                const baseCents = Math.floor(remainingCents / installmentCount);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const dueDates = Array.from({length: installmentCount}, (_, i) => {
                    const dueDate = new Date(createdAt);
                    dueDate.setMonth(dueDate.getMonth() + i + 1);
                    return dueDate;
                });
                // Overdue the way the reminder job decides it: due before today.
                const pastDue = dueDates.filter((d) => d < today).length;
                // COMPLETED: everything paid. ACTIVE: all but the latest past-due
                // installment, which is left overdue; every other ACTIVE deal
                // has a part-payment on it, which keeps it OVERDUE.
                const paidCount = status === DealStatus.COMPLETED ? installmentCount : Math.max(pastDue - 1, 0);
                const hasPartPayment = status === DealStatus.ACTIVE && dealSeed % 2 === 1 && pastDue > 0;

                for (let i = 0; i < installmentCount; i++) {
                    const order = i + 1;
                    const isLast = order === installmentCount;
                    const amount = (isLast ? remainingCents - baseCents * (installmentCount - 1) : baseCents) / 100;
                    const dueDate = dueDates[i];
                    const isPaid = i < paidCount;
                    const isPartPaid = !isPaid && hasPartPayment && i === paidCount;
                    const partAmount = Math.round(amount * 0.4);
                    const isOverdue = !isPaid && dueDate < today;

                    await prisma.paymentSchedule.create({
                        data: {
                            dealId: deal.id,
                            dueDate,
                            amount,
                            paidAmount: isPaid ? amount : isPartPaid ? partAmount : 0,
                            status: isPaid
                                ? PaymentScheduleStatus.PAID
                                : isOverdue
                                    ? PaymentScheduleStatus.OVERDUE
                                    : PaymentScheduleStatus.PENDING,
                            order,
                        },
                    });

                    if (isPaid) {
                        await recordPayment(amount, isLast ? PaymentType.FINAL : PaymentType.INSTALLMENT, dueDate, order);
                    } else if (isPartPaid) {
                        // A few days after it fell due.
                        const paidAt = new Date(dueDate);
                        paidAt.setDate(paidAt.getDate() + 3);
                        await recordPayment(partAmount, PaymentType.INSTALLMENT, paidAt < today ? paidAt : dueDate, order);
                    }
                }
            }

            dealSeq += 1;
            dealSeed += 1;
        }
    }

    // Receipt numbers for the payments above, as the app gives every
    // incoming payment (FIN-8).
    await numberUnnumberedPayments(prisma);

    // --- Tasks (mix of overdue, due today, upcoming, done) --------------
    const taskTitles = [
        "Кардарга чалып, келишимдин шарттарын талкуулоо", "Төлөм боюнча эскертүү жөнөтүү",
        "Брондоо документтерин даярдоо", "Объектти көргөндөн кийин кайра чалуу",
        "Паспорттун көчүрмөсүн алуу", "Батирди көрсөтүүгө убакыт белгилөө",
        "Бөлүп төлөөнүн түшкөнүн текшерүү", "Кардарга курулуштун жүрүшү тууралуу кабарлоо",
    ];
    const allAssignees = [...teams.map((t) => t.head), ...teams.flatMap((t) => t.managers), {id: financeUser.id, fullName: financeUser.fullName}];
    const taskStatuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
    const taskDueOffsets = [-3, -1, 0, 0, 1, 3, 7, -2];

    for (let t = 0; t < 18; t++) {
        const assignee = pick(allAssignees, t);
        const status = pick(taskStatuses, t);
        const dueDate = daysFromNow(pick(taskDueOffsets, t));

        const task = await prisma.task.create({
            data: {
                title: pick(taskTitles, t),
                status,
                dueDate,
                assignedToId: assignee.id,
                companyId: company.id,
                branchId: teams.find((tm) => tm.head.id === assignee.id || tm.managers.some((m) => m.id === assignee.id))?.branchId,
            },
        });

        await prisma.activity.create({
            data: {
                action: ActivityAction.CREATED_TASK,
                type: ActivityType.TASK_CREATED,
                ...activityText('taskCreated', {task: task.title}),
                companyId: company.id,
                userId: assignee.id,
                taskId: task.id,
                createdAt: monthsAgo(0),
            },
        });
    }

    // --- List-price change requests (SH-2) -----------------------------
    // A Sales Head can't change a list price alone; it waits for someone with
    // units.approve_price. Two wait on the Price changes page, one went
    // through (the unit already carries the new price) and one was turned down.
    const admin = await prisma.user.findUniqueOrThrow({where: {email: "admin@crm.dev"}, select: {id: true}});
    const priceRequests: {change: number; status: UnitPriceRequestStatus; rejectionReason?: string}[] = [
        {change: 1.05, status: UnitPriceRequestStatus.PENDING},
        {change: 0.97, status: UnitPriceRequestStatus.PENDING},
        {change: 1.04, status: UnitPriceRequestStatus.APPROVED},
        {change: 0.9, status: UnitPriceRequestStatus.REJECTED, rejectionReason: "10% арзандатуу өтө көп: 5% чейин гана мүмкүн"},
    ];
    for (const [r, request] of priceRequests.entries()) {
        const unit = takeUnit("orion");
        const requestedPrice = Math.round((unit.price * request.change) / 10_000) * 10_000;
        const decided = request.status !== UnitPriceRequestStatus.PENDING;
        await prisma.unitPriceRequest.create({
            data: {
                companyId: company.id,
                unitId: unit.id,
                status: request.status,
                currentPrice: unit.price,
                requestedPrice,
                requestedById: pick(teams, r).head.id,
                decidedById: decided ? admin.id : undefined,
                decidedAt: decided ? daysFromNow(-r) : undefined,
                rejectionReason: request.rejectionReason,
                createdAt: daysFromNow(-(r + 1)),
            },
        });
        if (request.status === UnitPriceRequestStatus.APPROVED) {
            await prisma.unit.update({where: {id: unit.id}, data: {price: requestedPrice}});
        }
    }

    console.log(`Extended demo data: ${branches.length} branches, ${teams.reduce((n, t) => n + 1 + t.managers.length, 0) + 1} additional users, ${clients.length} clients, ${leadSeed} leads, ${dealSeq - 1} deals, 18 tasks, ${priceRequests.length} price requests.`);
    console.log("Sales Head login: sales.head.1@crm.dev / password123");
    console.log("Sales Manager login: sales.manager.1.1@crm.dev / password123");
    console.log("Finance login: finance@crm.dev / password123");
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

    if (!isStrongPassword(password)) {
        fail("ADMIN_PASSWORD must be at least 8 characters with an upper-case letter, a lower-case letter and a digit");
    }

    // The "Company Admin" role may not exist yet — this can run against a
    // database that has never booted the app (and so never seeded it). Run
    // the same seeding RbacService runs on every boot, then look the role
    // up by its isDefaultCompanyAdmin marker rather than by name, since a
    // platform administrator may have renamed it.
    const rbacService = new RbacService(prisma as never, undefined as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const companyAdminRole = await prisma.role.findFirstOrThrow({where: {isDefaultCompanyAdmin: true}});

    await prisma.user.create({
        data: {
            fullName: args.adminName,
            email: args.adminEmail,
            passwordHash: await bcrypt.hash(password, 10),
            // SA-6: a generated password is replaced at first sign-in.
            mustChangePassword: generated,
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

    if (!isStrongPassword(password)) {
        fail("ADMIN_PASSWORD must be at least 8 characters with an upper-case letter, a lower-case letter and a digit");
    }

    // The "Super Admin" role may not exist yet — this can run against a
    // database that has never booted the app (and so never seeded it). Run
    // the same seeding RbacService runs on every boot, then look the role
    // up by its isPlatformRole marker rather than by name, since a
    // platform administrator may have renamed it.
    const rbacService = new RbacService(prisma as never, undefined as never);
    await rbacService.syncCatalog();
    await rbacService.seedDefaultRolesIfMissing();
    await ensureDefaultRolePermissions(prisma);
    const superAdminRole = await prisma.role.findFirstOrThrow({where: {isPlatformRole: true}});

    await prisma.user.create({
        data: {
            fullName: name,
            email,
            passwordHash: await bcrypt.hash(password, 10),
            // SA-6: a generated password is replaced at first sign-in.
            mustChangePassword: generated,
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
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
        console.log(USAGE);
        return;
    }

    if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");

    const flags = parseFlags(args);
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

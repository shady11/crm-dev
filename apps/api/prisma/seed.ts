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
import {
    ActivityAction,
    ActivityType,
    DealStatus,
    DiscountApprovalStatus,
    FinancingType,
    LeadStatus,
    PaymentMethod,
    PaymentScheduleStatus,
    PaymentType,
    PrismaClient,
    TaskStatus,
    UnitStatus,
    UnitType,
} from "@/generated/prisma/client";
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

// --- Demo-data generators -------------------------------------------------
// Deterministic-ish helpers for the realistic sample data seedDemo() creates
// below (branches, users per role, leads, clients, deals, payments, tasks).
// Not cryptographically random — this is fixture data, not secrets.

const FIRST_NAMES = [
    "Aibek", "Nurlan", "Aidana", "Cholpon", "Bakyt", "Gulnara", "Ermek", "Zarina",
    "Talant", "Aizada", "Ruslan", "Nazira", "Marat", "Elvira", "Tilek", "Sabina",
    "Azamat", "Dinara", "Kanat", "Meerim", "Ulan", "Aigerim", "Bekzat", "Nasiba",
];
const LAST_NAMES = [
    "Zhumabekov", "Sadykov", "Toktogulova", "Isaev", "Bekova", "Moldalieva",
    "Kadyrov", "Asanova", "Tashiev", "Orozova", "Baiysheva", "Dzhumaliev",
    "Kydyrov", "Sultanova", "Rysbekov", "Mamytova", "Turgunbaev", "Alieva",
];

function personName(seed: number): string {
    return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed * 7) % LAST_NAMES.length]}`;
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

    const units: {id: string; price: number; projectId: string}[] = [];

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
            const price = 42000 + unitIndex * 3500;
            const unit = await prisma.unit.create({
                data: {
                    number: `${floorNumber}${unitIndex.toString().padStart(2, "0")}`,
                    type: UnitType.APARTMENT,
                    status: UnitStatus.AVAILABLE,
                    rooms: unitIndex % 3 === 0 ? 3 : unitIndex % 2 === 0 ? 2 : 1,
                    area: 42 + unitIndex * 4,
                    price,
                    projectId: project.id,
                    blockId: block.id,
                    entranceId: entrance.id,
                    floorId: floor.id,
                },
            });
            units.push({id: unit.id, price, projectId: project.id});
        }
    }

    await seedDemoTenantData({company, units});

    console.log("Database seeded successfully");
    console.log("Admin login: admin@crm.dev");
    console.log("Admin password: password123");
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
    units: {id: string; price: number; projectId: string}[];
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
            data: {companyId: company.id, name: "Bishkek Central", city: "Bishkek", address: "Chuy Ave 123", phone: "+996700000010"},
        }),
        prisma.branch.create({
            data: {companyId: company.id, name: "Osh Branch", city: "Osh", address: "Lenin St 45", phone: "+996700000011"},
        }),
    ]);

    const financeUser = await prisma.user.create({
        data: {
            fullName: "Nurgul Baktybekova",
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
                    companyId: company.id,
                    branchId: team.branchId,
                },
            });
            clients.push({id: client.id, branchId: team.branchId, fullName: client.fullName});
        }
    }

    // --- Leads (22 per branch, every status represented) --------------
    const leadStatuses = Object.values(LeadStatus);
    const leadSources = ["Website", "Instagram", "Referral", "Walk-in", "Phone"];
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
                    lastContactAt: monthsAgo(0),
                    assignedAt: monthsAgo(1),
                },
            });
            leadSeed += 1;
        }
    }

    // --- Deals, payment schedules and payments -------------------------
    const dealPlan: {status: DealStatus; count: number}[] = [
        {status: DealStatus.RESERVED, count: 6},
        {status: DealStatus.CONTRACT_SIGNED, count: 5},
        {status: DealStatus.ACTIVE, count: 6},
        {status: DealStatus.COMPLETED, count: 4},
        {status: DealStatus.CANCELLED, count: 2},
        {status: DealStatus.EXPIRED, count: 1},
    ];

    const financingTypes = Object.values(FinancingType);
    const paymentMethods = Object.values(PaymentMethod);

    let unitCursor = 0;
    let dealSeq = 1;
    let dealSeed = 0;

    for (const {status, count} of dealPlan) {
        for (let i = 0; i < count; i++) {
            const unit = units[unitCursor];
            unitCursor += 1;
            const team = teams[dealSeed % teams.length];
            const manager = pick(team.managers, dealSeed);
            const client = clients[dealSeed % clients.length];

            const listPrice = unit.price;
            const hasDiscount = dealSeed % 8 === 0;
            const discountPercent = hasDiscount ? 8 : undefined;
            const salePrice = hasDiscount ? Math.round(listPrice * (1 - discountPercent! / 100)) : listPrice;
            const deposit = Math.round(salePrice * 0.15);

            // CONTRACT_SIGNED deals are recent (only the deposit is due so
            // far, the rest sits PENDING in the future) — ACTIVE/COMPLETED
            // ones are older, so their installment schedule has had time to
            // include a genuinely OVERDUE row.
            const createdAt = monthsAgo(
                status === DealStatus.RESERVED ? 0 :
                status === DealStatus.CONTRACT_SIGNED ? 1 :
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
                    dealNumber: `DL-${new Date().getFullYear()}-${String(dealSeq).padStart(4, "0")}`,
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
                    reservationExpiresAt: status === DealStatus.RESERVED ? daysFromNow(dealSeed % 5 === 0 ? -1 : 2) : undefined,
                    contractNumber: status === DealStatus.CONTRACT_SIGNED || status === DealStatus.ACTIVE || status === DealStatus.COMPLETED
                        ? `CN-${dealSeq}` : undefined,
                    contractDate: status === DealStatus.CONTRACT_SIGNED || status === DealStatus.ACTIVE || status === DealStatus.COMPLETED
                        ? createdAt : undefined,
                    cancelledAt: status === DealStatus.CANCELLED ? monthsAgo(1) : undefined,
                    cancelReason: status === DealStatus.CANCELLED ? "Client withdrew" : undefined,
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
                    action: ActivityAction.CREATED_DEAL,
                    type: ActivityType.DEAL_CREATED,
                    title: `Deal ${deal.dealNumber} created`,
                    companyId: company.id,
                    userId: manager.id,
                    dealId: deal.id,
                    clientId: client.id,
                    createdAt,
                },
            });

            // Payment schedules + payments only make sense once a contract
            // exists — RESERVED/CANCELLED/EXPIRED deals never got that far.
            const hasSchedule = status === DealStatus.CONTRACT_SIGNED || status === DealStatus.ACTIVE || status === DealStatus.COMPLETED;
            if (hasSchedule) {
                const installmentCount = 4;
                const installmentAmount = Math.round((salePrice - deposit) / (installmentCount - 1));

                for (let order = 1; order <= installmentCount; order++) {
                    const isDeposit = order === 1;
                    const amount = isDeposit ? deposit : installmentAmount;
                    const dueDate = new Date(createdAt);
                    dueDate.setMonth(dueDate.getMonth() + (order - 1));

                    // COMPLETED deals: fully paid. ACTIVE: paid up through
                    // "today", remainder pending/overdue. CONTRACT_SIGNED:
                    // only the deposit paid so far.
                    const monthsSinceCreation = status === DealStatus.COMPLETED
                        ? installmentCount
                        : status === DealStatus.ACTIVE
                            // Capped below the last installment so an ACTIVE
                            // deal always has at least one schedule row left
                            // pending/overdue — otherwise it'd look identical
                            // to COMPLETED on the finance/revenue dashboards.
                            ? Math.min(
                                Math.floor((Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)),
                                installmentCount - 1,
                            )
                            : 1;
                    const isPaid = order <= monthsSinceCreation;
                    const isOverdue = !isPaid && dueDate.getTime() < Date.now();

                    const scheduleStatus = isPaid
                        ? PaymentScheduleStatus.PAID
                        : isOverdue
                            ? PaymentScheduleStatus.OVERDUE
                            : PaymentScheduleStatus.PENDING;

                    await prisma.paymentSchedule.create({
                        data: {
                            dealId: deal.id,
                            dueDate,
                            amount,
                            paidAmount: isPaid ? amount : 0,
                            status: scheduleStatus,
                            order,
                        },
                    });

                    if (isPaid) {
                        const paidAt = dueDate;
                        await prisma.payment.create({
                            data: {
                                dealId: deal.id,
                                userId: manager.id,
                                amount,
                                paymentMethod: pick(paymentMethods, dealSeed + order),
                                paymentType: isDeposit ? PaymentType.DEPOSIT : order === installmentCount ? PaymentType.FINAL : PaymentType.INSTALLMENT,
                                paidAt,
                                reference: `PMT-${dealSeq}-${order}`,
                            },
                        });

                        await prisma.activity.create({
                            data: {
                                action: ActivityAction.RECEIVED_PAYMENT,
                                type: ActivityType.PAYMENT_RECEIVED,
                                title: `Payment received for ${deal.dealNumber}`,
                                companyId: company.id,
                                userId: manager.id,
                                dealId: deal.id,
                                createdAt: paidAt,
                            },
                        });
                    }
                }
            }

            dealSeq += 1;
            dealSeed += 1;
        }
    }

    // --- Tasks (mix of overdue, due today, upcoming, done) --------------
    const taskTitles = [
        "Call client about contract terms", "Send payment reminder", "Prepare reservation documents",
        "Follow up after site visit", "Collect passport copy", "Schedule apartment viewing",
        "Confirm installment payment", "Update client on construction progress",
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
                title: `Task "${task.title}" created`,
                companyId: company.id,
                userId: assignee.id,
                taskId: task.id,
                createdAt: monthsAgo(0),
            },
        });
    }

    console.log(`Extended demo data: ${branches.length} branches, ${teams.reduce((n, t) => n + 1 + t.managers.length, 0) + 1} additional users, ${clients.length} clients, ${leadSeed} leads, ${dealSeq - 1} deals, 18 tasks.`);
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

    if (password.length < 8) {
        fail("ADMIN_PASSWORD must be at least 8 characters");
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

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { currentImpersonatorId } from "@/common/context/impersonation-context";

type ActivityData = { impersonatedById?: string | null };

/** SA-2: marks an activity written while a platform admin views as a user. */
export function stampImpersonator<T extends ActivityData | ActivityData[]>(data: T): T {
    const impersonatorId = currentImpersonatorId();
    if (!impersonatorId) return data;
    const stamp = (row: ActivityData) => ({ ...row, impersonatedById: row.impersonatedById ?? impersonatorId });
    return (Array.isArray(data) ? data.map(stamp) : stamp(data)) as T;
}

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        });

        super({
            adapter,
        });

        // Returned instead of `this`, so every query through this service,
        // transactions included, goes through the extension. The class's own
        // methods (onModuleInit…) still resolve through it.
        return this.$extends({
            query: {
                activity: {
                    create({ args, query }) {
                        args.data = stampImpersonator(args.data as ActivityData) as typeof args.data;
                        return query(args);
                    },
                    createMany({ args, query }) {
                        args.data = stampImpersonator(args.data as ActivityData | ActivityData[]) as typeof args.data;
                        return query(args);
                    },
                },
            },
        }) as unknown as PrismaService;
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}


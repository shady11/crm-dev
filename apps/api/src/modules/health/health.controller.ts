import {Controller, Get} from "@nestjs/common";
import {SkipThrottle} from "@nestjs/throttler";
import {PrismaService} from "@/database/prisma.service";

// An uptime monitor polls this on a fixed interval and must never be rate
// limited into reporting a false outage.
@SkipThrottle()
@Controller("health")
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async check() {
        await this.prisma.$queryRaw`SELECT 1`;

        return {
            status: "ok",
            database: "ok",
        };
    }
}
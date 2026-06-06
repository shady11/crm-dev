import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";

@Controller("health")
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async check() {
        const result = await this.prisma.$queryRaw`SELECT 1 as ok`;

        return {
            status: "ok1",
            database: result,
        };
    }
}
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
            include: {
                company: true,
            },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                company: true,
            },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }
}
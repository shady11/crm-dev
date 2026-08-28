import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {UpdateUserPasswordDto} from "./dto/update-user-password.dto";
import {QueryUsersDto} from "./dto/query-users.dto";
import {canActorSeeRole, getManageableRoles} from "@/modules/users/users.constants";

const USER_SAFE_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryUsersDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            companyId: user.companyId,
            isActive: query.isActive ?? true,
        };

        if (query.role) {
            where.role = query.role;
        }

        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fullName: "asc" },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
            select: USER_SAFE_SELECT,
        });

        if (!target || !canActorSeeRole(user.role, target.role)) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    async create(user: AuthUser, dto: CreateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureEmailIsUnique(dto.email);

        const passwordHash = await bcrypt.hash(dto.password, 10);

        return this.prisma.user.create({
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                role: dto.role,
                companyId: user.companyId,
            },
            select: USER_SAFE_SELECT,
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
        });

        if (!target) {
            throw new NotFoundException("User not found");
        }

        if (dto.email && dto.email !== target.email) {
            await this.ensureEmailIsUnique(dto.email, id);
        }

        if (dto.isActive === false && target.id === user.id) {
            throw new BadRequestException("You cannot deactivate your own account");
        }

        const rolesChanged = dto.role !== undefined && dto.role !== target.role;
        const beingDeactivated = dto.isActive === false && target.isActive === true;

        return this.prisma.user.update({
            where: { id },
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                role: dto.role,
                isActive: dto.isActive,
                ...(rolesChanged || beingDeactivated ? { sessionsValidFrom: new Date() } : {}),
            },
            select: USER_SAFE_SELECT,
        });
    }

    async updatePassword(user: AuthUser, id: string, dto: UpdateUserPasswordDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
        });

        if (!target) {
            throw new NotFoundException("User not found");
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        await this.prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                sessionsValidFrom: new Date()
            },
        });

        return { success: true };
    }

    async revokeSessions(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
        });

        if (!target) {
            throw new NotFoundException("User not found");
        }

        await this.prisma.user.update({
            where: { id },
            data: { sessionsValidFrom: new Date() },
        });

        return { success: true };
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (id === user.id) {
            throw new BadRequestException("You cannot delete your own account");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
        });

        if (!target) {
            throw new NotFoundException("User not found");
        }

        await this.prisma.user.update({
            where: { id },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });

        return { success: true };
    }

    // --------------------------------------------------------------------
    // Used internally by AuthModule — unchanged signatures
    // --------------------------------------------------------------------

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { company: true },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { company: true },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }

    private async ensureEmailIsUnique(email: string, exceptUserId?: string) {
        const existing = await this.prisma.user.findFirst({
            where: {
                email,
                id: exceptUserId ? { not: exceptUserId } : undefined,
            },
        });

        if (existing) {
            throw new ConflictException("User with this email already exists");
        }
    }

    async getRoleSummary(user: AuthUser) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const visibleRoles = getManageableRoles(user.role);

        const [counts, samples] = await Promise.all([
            this.prisma.user.groupBy({
                by: ["role"],
                where: {
                    companyId: user.companyId,
                    role: { in: visibleRoles },
                    deletedAt: null,
                },
                _count: { _all: true },
            }),
            
            Promise.all(
                visibleRoles.map((role) =>
                    this.prisma.user.findMany({
                        where: {
                            companyId: user.companyId,
                            role,
                            deletedAt: null,
                        },
                        orderBy: { createdAt: "desc" },
                        take: 3,
                        select: { id: true, fullName: true },
                    }),
                ),
            ),
        ]);

        const countByRole = new Map(counts.map((c) => [c.role, c._count._all]));

        return visibleRoles.map((role, index) => ({
            role,
            count: countByRole.get(role) ?? 0,
            sample: samples[index],
        }));
    }
}
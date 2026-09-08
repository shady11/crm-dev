import {BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateBranchDto} from "./dto/create-branch.dto";
import {UpdateBranchDto} from "./dto/update-branch.dto";
import {QueryBranchesDto} from "./dto/query-branches.dto";

const BRANCH_SELECT = {
    id: true,
    companyId: true,
    name: true,
    city: true,
    address: true,
    phone: true,
    deactivatedAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.BranchSelect;

@Injectable()
export class BranchesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryBranchesDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const where: Prisma.BranchWhereInput = {companyId: user.companyId};

        if (!query.includeDeactivated) {
            where.deactivatedAt = null;
        }

        if (query.search) {
            where.name = {contains: query.search, mode: "insensitive"};
        }

        const [items, total] = await Promise.all([
            this.prisma.branch.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {name: "asc"},
                select: BRANCH_SELECT,
            }),
            this.prisma.branch.count({where}),
        ]);

        return {
            items,
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const branch = await this.prisma.branch.findFirst({
            where: {id, companyId: user.companyId},
            select: BRANCH_SELECT,
        });

        if (!branch) {
            throw new NotFoundException("Branch not found");
        }

        return branch;
    }

    async create(user: AuthUser, dto: CreateBranchDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureNameIsUnique(user.companyId, dto.name);

        return this.prisma.branch.create({
            data: {
                companyId: user.companyId,
                name: dto.name,
                city: dto.city,
                address: dto.address,
                phone: dto.phone,
            },
            select: BRANCH_SELECT,
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateBranchDto) {
        await this.findOne(user, id);

        if (dto.name) {
            await this.ensureNameIsUnique(user.companyId as string, dto.name, id);
        }

        return this.prisma.branch.update({
            where: {id},
            data: {
                name: dto.name,
                city: dto.city,
                address: dto.address,
                phone: dto.phone,
            },
            select: BRANCH_SELECT,
        });
    }

    /**
     * Deactivation only — there is no delete path for a branch at all. A
     * branch with active users assigned cannot be deactivated either; the
     * caller must move or deactivate those users first.
     */
    async deactivate(user: AuthUser, id: string) {
        const branch = await this.findOne(user, id);

        if (branch.deactivatedAt) {
            throw new ConflictException("This branch is already deactivated");
        }

        const activeUserCount = await this.prisma.user.count({
            where: {branchId: id, isActive: true},
        });

        if (activeUserCount > 0) {
            throw new BadRequestException(
                "Cannot deactivate a branch with active users assigned — move or deactivate them first",
            );
        }

        return this.prisma.branch.update({
            where: {id},
            data: {deactivatedAt: new Date()},
            select: BRANCH_SELECT,
        });
    }

    async reactivate(user: AuthUser, id: string) {
        const branch = await this.findOne(user, id);

        if (!branch.deactivatedAt) {
            throw new ConflictException("This branch is not deactivated");
        }

        return this.prisma.branch.update({
            where: {id},
            data: {deactivatedAt: null},
            select: BRANCH_SELECT,
        });
    }

    private async ensureNameIsUnique(companyId: string, name: string, exceptBranchId?: string) {
        const existing = await this.prisma.branch.findFirst({
            where: {
                companyId,
                name,
                id: exceptBranchId ? {not: exceptBranchId} : undefined,
            },
        });

        if (existing) {
            throw new ConflictException("A branch with this name already exists");
        }
    }
}

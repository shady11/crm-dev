import {BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreatePhaseDto} from "./dto/create-phase.dto";
import {UpdatePhaseDto} from "./dto/update-phase.dto";

const PHASE_SELECT = {
    id: true,
    name: true,
    order: true,
    salesStatus: true,
    completionDate: true,
    projectId: true,
    blocks: {where: {deletedAt: null}, select: {id: true, name: true}, orderBy: {order: "asc"}},
} satisfies Prisma.ProjectPhaseSelect;

/**
 * Construction phases (очереди) of a project. A phase groups blocks that are
 * built and handed over together and carries their sales status and
 * expected completion; blocks outside any phase behave as on sale.
 */
@Injectable()
export class PhasesService {
    constructor(private readonly prisma: PrismaService) {}

    async findByProject(user: AuthUser, projectId: string) {
        const companyId = this.companyOf(user);
        await this.ensureProject(projectId, companyId);
        return this.prisma.projectPhase.findMany({
            where: {projectId},
            orderBy: [{order: "asc"}, {name: "asc"}],
            select: PHASE_SELECT,
        });
    }

    async create(user: AuthUser, projectId: string, dto: CreatePhaseDto) {
        const companyId = this.companyOf(user);
        await this.ensureProject(projectId, companyId);
        await this.ensureNameFree(projectId, dto.name);
        return this.prisma.projectPhase.create({
            data: {
                projectId,
                name: dto.name.trim(),
                order: dto.order ?? 0,
                salesStatus: dto.salesStatus,
                completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
            },
            select: PHASE_SELECT,
        });
    }

    async update(user: AuthUser, id: string, dto: UpdatePhaseDto) {
        const phase = await this.findOwned(user, id);
        if (dto.name && dto.name.trim() !== phase.name) {
            await this.ensureNameFree(phase.projectId, dto.name, id);
        }
        return this.prisma.projectPhase.update({
            where: {id},
            data: {
                name: dto.name?.trim(),
                order: dto.order,
                salesStatus: dto.salesStatus,
                // undefined leaves it alone, null clears it.
                completionDate: dto.completionDate === undefined ? undefined : dto.completionDate ? new Date(dto.completionDate) : null,
            },
            select: PHASE_SELECT,
        });
    }

    /** Its blocks stay, just without a phase (Block.phaseId is SET NULL). */
    async remove(user: AuthUser, id: string) {
        await this.findOwned(user, id);
        await this.prisma.projectPhase.delete({where: {id}});
        return {success: true};
    }

    private companyOf(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        return user.companyId;
    }

    private async ensureProject(projectId: string, companyId: string) {
        const project = await this.prisma.project.findFirst({where: {id: projectId, companyId, deletedAt: null}, select: {id: true}});
        if (!project) throw new NotFoundException("Project not found");
    }

    private async findOwned(user: AuthUser, id: string) {
        const companyId = this.companyOf(user);
        const phase = await this.prisma.projectPhase.findFirst({where: {id, project: {companyId, deletedAt: null}}});
        if (!phase) throw new NotFoundException("Phase not found");
        return phase;
    }

    private async ensureNameFree(projectId: string, name: string, exceptId?: string) {
        if (!name.trim()) throw new BadRequestException("Phase name is required");
        const clash = await this.prisma.projectPhase.findFirst({
            where: {projectId, name: name.trim(), ...(exceptId ? {id: {not: exceptId}} : {})},
            select: {id: true},
        });
        if (clash) throw new ConflictException(`Phase "${name.trim()}" already exists in this project`);
    }
}

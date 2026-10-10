import {ConflictException, ForbiddenException, NotFoundException} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
import {PhasesService} from "./phases.service";

describe("PhasesService", () => {
    const user = {id: "admin-1", companyId: "company-1", permissions: []} as unknown as AuthUser;

    function build(opts: {project?: unknown; phase?: unknown; clash?: unknown} = {}) {
        const prisma = {
            project: {findFirst: jest.fn().mockResolvedValue(opts.project === undefined ? {id: "project-1"} : opts.project)},
            projectPhase: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn().mockImplementation(({where}: any) =>
                    Promise.resolve(where.name !== undefined ? (opts.clash ?? null) : (opts.phase ?? null))),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: "phase-new", ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: "phase-1", ...data})),
                delete: jest.fn().mockResolvedValue({}),
            },
        };
        return {service: new PhasesService(prisma as any), prisma};
    }

    it("rejects a user with no company", async () => {
        const {service} = build();
        await expect(service.findByProject({...user, companyId: null}, "project-1")).rejects.toThrow(ForbiddenException);
    });

    it("404s a project outside the caller company", async () => {
        const {service, prisma} = build({project: null});
        await expect(service.create(user, "project-x", {name: "Phase 1"})).rejects.toThrow(NotFoundException);
        expect(prisma.projectPhase.create).not.toHaveBeenCalled();
    });

    it("creates a phase with its status and completion date", async () => {
        const {service, prisma} = build();
        await service.create(user, "project-1", {name: " Phase 2 ", salesStatus: "UPCOMING", completionDate: "2027-12-31"} as any);

        const {data} = prisma.projectPhase.create.mock.calls[0][0];
        expect(data).toMatchObject({projectId: "project-1", name: "Phase 2", salesStatus: "UPCOMING"});
        expect(data.completionDate).toEqual(new Date("2027-12-31"));
    });

    it("rejects a name already used in the project", async () => {
        const {service, prisma} = build({clash: {id: "phase-2"}});
        await expect(service.create(user, "project-1", {name: "Phase 1"})).rejects.toThrow(ConflictException);
        expect(prisma.projectPhase.create).not.toHaveBeenCalled();
    });

    it("clears the completion date with null and leaves it alone when omitted", async () => {
        const {service, prisma} = build({phase: {id: "phase-1", projectId: "project-1", name: "Phase 1"}});

        await service.update(user, "phase-1", {completionDate: null});
        expect(prisma.projectPhase.update.mock.calls[0][0].data.completionDate).toBeNull();

        await service.update(user, "phase-1", {salesStatus: "ON_SALE"} as any);
        expect(prisma.projectPhase.update.mock.calls[1][0].data.completionDate).toBeUndefined();
    });

    it("404s a phase from another company on update and delete", async () => {
        const {service, prisma} = build({phase: null});
        await expect(service.update(user, "phase-x", {name: "X"})).rejects.toThrow(NotFoundException);
        await expect(service.remove(user, "phase-x")).rejects.toThrow(NotFoundException);
        expect(prisma.projectPhase.delete).not.toHaveBeenCalled();
    });
});

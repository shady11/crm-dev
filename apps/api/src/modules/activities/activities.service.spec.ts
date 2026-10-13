import {ForbiddenException} from "@nestjs/common";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ActivitiesService} from "./activities.service";

const baseUser: AuthUser = {
    id: "user-1",
    email: "user@crm.dev",
    name: "User",
    roleId: "role-company-admin",
    roleName: "Company Admin",
    companyId: "company-1",
    company: null,
    branchId: null,
    branch: null,
    permissions: ["activities.view"],
};

function build() {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);

    const prisma = {
        activity: {findMany, count},
    } as unknown as PrismaService;

    return {service: new ActivitiesService(prisma), findMany, count};
}

describe("ActivitiesService", () => {
    it("rejects a user with no company", async () => {
        const {service} = build();

        await expect(service.findAll({...baseUser, companyId: null}, {})).rejects.toThrow(ForbiddenException);
    });

    it("scopes COMPANY_ADMIN to the whole company, with no branch filter", async () => {
        const {service, findMany} = build();

        await service.findAll(baseUser, {});

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {companyId: "company-1"},
            }),
        );
    });

    it("returns the lead, client and deal each row is about", async () => {
        const {service, findMany} = build();

        await service.findAll(baseUser, {});

        const {include} = findMany.mock.calls[0][0];
        expect(include.lead).toEqual({select: {id: true, fullName: true}});
        expect(include.client).toEqual({select: {id: true, fullName: true}});
        expect(include.deal).toEqual({select: {id: true, dealNumber: true, client: {select: {id: true, fullName: true}}}});
    });

    it.each([
        ["deal", {dealId: {not: null}}],
        ["client", {clientId: {not: null}, dealId: null}],
        ["lead", {leadId: {not: null}}],
    ])("narrows to rows about a %s", async (subject, filter) => {
        const {service, findMany, count} = build();

        await service.findAll(baseUser, {subject} as any);

        const expected = {companyId: "company-1", AND: [filter]};
        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({where: expected}));
        expect(count).toHaveBeenCalledWith({where: expected});
    });

    it("limits activities.view_own to the caller's own actions, ignoring another userId", async () => {
        const {service, findMany, count} = build();
        const manager = {...baseUser, id: "manager-1", isBranchScoped: true, branchId: "branch-1", permissions: ["activities.view_own"]};

        await service.findAll(manager, {userId: "someone-else"} as any);

        const where = findMany.mock.calls[0][0].where;
        expect(where.userId).toBe("manager-1");
        expect(count).toHaveBeenCalledWith({where});
    });

    it("lets activities.view filter by any user", async () => {
        const {service, findMany} = build();

        await service.findAll(baseUser, {userId: "user-2"} as any);

        expect(findMany.mock.calls[0][0].where.userId).toBe("user-2");
    });

    it("keeps a Sales Head's branch scope when they filter by a person (SH-7)", async () => {
        const {service, findMany} = build();
        const head: AuthUser = {...baseUser, id: "head-1", roleName: "Sales Head", isBranchScoped: true, branchId: "branch-1"};

        await service.findAll(head, {userId: "other-branch-user"} as any);

        const where = findMany.mock.calls[0][0].where;
        expect(where.userId).toBe("other-branch-user");
        expect(where.user).toEqual({branchId: "branch-1"});
    });

    it("lets COMPANY_ADMIN narrow to one branch via the query param", async () => {
        const {service, findMany} = build();

        await service.findAll(baseUser, {branchId: "branch-2"} as any);

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {companyId: "company-1", user: {branchId: "branch-2"}},
            }),
        );
    });

    it.each(["Sales Head", "Sales Manager"])(
        "restricts %s to their own branch's users, ignoring any branchId query param",
        async (roleName) => {
            const {service, findMany} = build();
            const branchUser: AuthUser = {...baseUser, roleName, isBranchScoped: true, branchId: "branch-1"};

            await service.findAll(branchUser, {branchId: "someone-elses-branch"} as any);

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {companyId: "company-1", user: {branchId: "branch-1"}},
                }),
            );
        },
    );
});

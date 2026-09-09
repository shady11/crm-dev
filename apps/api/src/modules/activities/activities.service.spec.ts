import {ForbiddenException} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ActivitiesService} from "./activities.service";

const baseUser: AuthUser = {
    id: "user-1",
    email: "user@crm.dev",
    name: "User",
    role: UserRole.COMPANY_ADMIN,
    companyId: "company-1",
    company: null,
    branchId: null,
    branch: null,
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

    it("lets COMPANY_ADMIN narrow to one branch via the query param", async () => {
        const {service, findMany} = build();

        await service.findAll(baseUser, {branchId: "branch-2"} as any);

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {companyId: "company-1", user: {branchId: "branch-2"}},
            }),
        );
    });

    it.each([UserRole.SALES_HEAD, UserRole.SALES_MANAGER])(
        "restricts %s to their own branch's users, ignoring any branchId query param",
        async (role) => {
            const {service, findMany} = build();
            const branchUser: AuthUser = {...baseUser, role, branchId: "branch-1"};

            await service.findAll(branchUser, {branchId: "someone-elses-branch"} as any);

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {companyId: "company-1", user: {branchId: "branch-1"}},
                }),
            );
        },
    );
});

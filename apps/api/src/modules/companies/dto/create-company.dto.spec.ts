import {plainToInstance} from "class-transformer";
import {validate} from "class-validator";
import {CreateCompanyDto} from "./create-company.dto";

const base = {name: "Ош Курулуш", adminFullName: "Бакыт Осмонов", adminEmail: "osh.admin@example.kg"};

async function check(extra: Record<string, unknown>) {
    const dto = plainToInstance(CreateCompanyDto, {...base, ...extra});
    return {dto, errors: await validate(dto)};
}

describe("CreateCompanyDto (SA-1)", () => {
    it.each([[""], ["   "]])("treats a blank admin password (%j) as 'generate one'", async (adminPassword) => {
        const {dto, errors} = await check({adminPassword});
        expect(errors).toEqual([]);
        expect(dto.adminPassword).toBeUndefined();
    });

    it("still refuses a typed password that is too short", async () => {
        const {errors} = await check({adminPassword: "123"});
        expect(errors.map((e) => e.property)).toEqual(["adminPassword"]);
    });

    it("keeps a typed password as it is", async () => {
        const {dto, errors} = await check({adminPassword: "Password123"});
        expect(errors).toEqual([]);
        expect(dto.adminPassword).toBe("Password123");
    });
});

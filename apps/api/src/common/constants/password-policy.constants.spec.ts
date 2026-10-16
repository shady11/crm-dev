import {generateStrongPassword, isStrongPassword} from "./password-policy.constants";

describe("password policy (SA-6)", () => {
    it("checks length, both letter cases and a digit", () => {
        expect(isStrongPassword("Password1")).toBe(true);
        expect(isStrongPassword("password123")).toBe(false);
        expect(isStrongPassword("PASSWORD123")).toBe(false);
        expect(isStrongPassword("Password")).toBe(false);
        expect(isStrongPassword("Pass1")).toBe(false);
    });

    it("only ever generates passwords that meet it", () => {
        for (let i = 0; i < 500; i++) {
            expect(isStrongPassword(generateStrongPassword())).toBe(true);
        }
    });
});

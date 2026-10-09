import {normalizePhone} from "./phone.util";

describe("normalizePhone", () => {
    it.each([
        ["0555 123 456", "+996555123456"],
        ["555-123-456", "+996555123456"],
        ["555123456", "+996555123456"],
        ["996555123456", "+996555123456"],
        ["+996 555 12 34 56", "+996555123456"],
        ["+996555123456", "+996555123456"],
        ["(0555) 12-34-56", "+996555123456"],
    ])("stores %s as %s", (raw, expected) => {
        expect(normalizePhone(raw)).toBe(expected);
    });

    it("keeps a foreign number's own country code", () => {
        expect(normalizePhone("+7 701 123 45 67")).toBe("+77011234567");
    });

    it("leaves something that isn't a recognisable number as typed", () => {
        expect(normalizePhone("  12345  ")).toBe("12345");
    });
});

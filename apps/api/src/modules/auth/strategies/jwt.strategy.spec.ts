import {ConfigService} from "@nestjs/config";
import {JwtStrategy} from "./jwt.strategy";
import {SessionValidationService} from "../session-validation.service";

/**
 * The strategy itself has two jobs: refuse to boot with no JWT_SECRET
 * configured (rather than silently signing/verifying with an undefined
 * key), and delegate token validation entirely to
 * SessionValidationService — passport-jwt only proves the signature and
 * expiry, everything else (revocation, tenant suspension, impersonation
 * liveness) lives in that one place.
 */
describe("JwtStrategy", () => {
    const configWith = (secret: string | undefined) =>
        ({get: jest.fn().mockReturnValue(secret)}) as unknown as ConfigService;

    it("throws at construction time when JWT_SECRET is not configured", () => {
        const sessionValidation = {} as SessionValidationService;
        expect(() => new JwtStrategy(configWith(undefined), sessionValidation)).toThrow(
            "JWT_SECRET is not defined",
        );
    });

    it("constructs successfully when JWT_SECRET is configured", () => {
        const sessionValidation = {} as SessionValidationService;
        expect(() => new JwtStrategy(configWith("test-secret"), sessionValidation)).not.toThrow();
    });

    it("delegates validate() entirely to SessionValidationService.validate()", async () => {
        const authUser = {id: "user-1"} as any;
        const sessionValidation = {validate: jest.fn().mockResolvedValue(authUser)} as unknown as SessionValidationService;
        const strategy = new JwtStrategy(configWith("test-secret"), sessionValidation);

        const payload = {id: "user-1", iat: 0, exp: 0} as any;
        const result = await strategy.validate(payload);

        expect(sessionValidation.validate).toHaveBeenCalledWith(payload);
        expect(result).toBe(authUser);
    });

    it("propagates a rejection from SessionValidationService.validate() (e.g. revoked session)", async () => {
        const sessionValidation = {
            validate: jest.fn().mockRejectedValue(new Error("Session has been revoked.")),
        } as unknown as SessionValidationService;
        const strategy = new JwtStrategy(configWith("test-secret"), sessionValidation);

        await expect(strategy.validate({id: "user-1", iat: 0, exp: 0} as any)).rejects.toThrow(
            "Session has been revoked.",
        );
    });
});

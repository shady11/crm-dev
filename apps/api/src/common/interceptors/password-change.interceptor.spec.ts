import {ForbiddenException} from "@nestjs/common";
import {of} from "rxjs";
import {PasswordChangeInterceptor} from "./password-change.interceptor";

describe("PasswordChangeInterceptor (SA-6)", () => {
    const interceptor = new PasswordChangeInterceptor();
    const run = (request: Record<string, unknown>) =>
        interceptor.intercept({switchToHttp: () => ({getRequest: () => request})} as never, {handle: () => of("ok")});

    const mustChange = {id: "u1", mustChangePassword: true};

    it("refuses anything but changing the password", () => {
        expect(() => run({user: mustChange, method: "GET", path: "/api/leads"})).toThrow(ForbiddenException);
        expect(() => run({user: mustChange, method: "PATCH", path: "/api/auth/me"})).toThrow(ForbiddenException);
    });

    it("lets them read their profile and set a new password", () => {
        expect(() => run({user: mustChange, method: "GET", path: "/api/auth/me"})).not.toThrow();
        expect(() => run({user: mustChange, method: "PATCH", path: "/api/auth/me/password"})).not.toThrow();
    });

    it("says why, with a code the web app acts on", () => {
        try {
            run({user: mustChange, method: "GET", path: "/api/deals"});
        } catch (error) {
            expect((error as ForbiddenException).getResponse()).toMatchObject({code: "PASSWORD_CHANGE_REQUIRED"});
        }
    });

    it("does nothing for everyone else, or for a platform admin viewing as the user", () => {
        expect(() => run({user: {id: "u2"}, method: "GET", path: "/api/leads"})).not.toThrow();
        expect(() => run({method: "POST", path: "/api/auth/login"})).not.toThrow();
        expect(() => run({user: {...mustChange, impersonation: {sessionId: "s"}}, method: "GET", path: "/api/leads"})).not.toThrow();
    });
});

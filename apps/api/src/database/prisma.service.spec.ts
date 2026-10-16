import {runAsImpersonator} from "@/common/context/impersonation-context";
import {stampImpersonator} from "./prisma.service";

describe("stampImpersonator (SA-2)", () => {
    it("leaves an activity alone outside an impersonated request", () => {
        expect(stampImpersonator({title: "x"} as never)).toEqual({title: "x"});
    });

    it("names the platform admin on activities written while they view as a user", () => {
        runAsImpersonator("admin-1", () => {
            expect(stampImpersonator({title: "x"} as never)).toEqual({title: "x", impersonatedById: "admin-1"});
            expect(stampImpersonator([{title: "a"}, {title: "b"}] as never)).toEqual([
                {title: "a", impersonatedById: "admin-1"},
                {title: "b", impersonatedById: "admin-1"},
            ]);
        });
    });

    it("keeps an explicitly set value", () => {
        runAsImpersonator("admin-1", () => {
            expect(stampImpersonator({impersonatedById: "other"})).toEqual({impersonatedById: "other"});
        });
    });
});

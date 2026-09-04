import {readFileSync, readdirSync, statSync} from "fs";
import {join} from "path";

/**
 * The tenant boundary is enforced by convention, not by the type system: every
 * controller that touches company data applies CompanyGuard, which rejects any
 * user without a companyId. That is what keeps a SUPER_ADMIN — who belongs to
 * no company — out of every tenant's deals, clients and inventory, while still
 * letting them administer tenants through CompaniesController.
 *
 * A convention with no test is a convention that erodes. A new controller
 * written without CompanyGuard would silently expose one company's data to
 * another company's users, which is the worst failure this application can
 * have. If a controller genuinely has no company scope, add it below with the
 * reason — that is a decision worth making explicitly.
 */
describe("tenant boundary", () => {
    const MODULES_DIR = join(__dirname, "..", "..", "modules");

    /** Controllers with no company scope, and why. */
    const NO_COMPANY_SCOPE: Record<string, string> = {
        auth: "login happens before a company is known",
        health: "returns no data; polled by an uptime monitor",
        companies: "SUPER_ADMIN tenant administration, not data inside a tenant",
        references: "returns enum values only — no rows, nothing tenant-specific",
    };

    /** Controllers reachable without a token, and why. */
    const PUBLIC: Record<string, string> = {
        health: "an uptime monitor cannot authenticate",
    };

    /**
     * Decorators only. Without this, a comment mentioning CompanyGuard — such
     * as the one in companies.controller.ts explaining its absence — reads as
     * the guard being applied.
     */
    const stripComments = (source: string) =>
        source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    const controllers: {module: string; path: string}[] = [];

    const walk = (dir: string, moduleName: string) => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) walk(full, moduleName);
            else if (entry.endsWith(".controller.ts")) controllers.push({module: moduleName, path: full});
        }
    };

    for (const moduleName of readdirSync(MODULES_DIR)) {
        const moduleDir = join(MODULES_DIR, moduleName);
        if (statSync(moduleDir).isDirectory()) walk(moduleDir, moduleName);
    }

    it("finds the controllers to check", () => {
        expect(controllers.length).toBeGreaterThan(10);
    });

    it.each(controllers.map((c) => [c.module, c.path]))("%s is correctly scoped", (module, path) => {
        const source = stripComments(readFileSync(path as string, "utf8"));
        const scoped = source.includes("CompanyGuard");

        expect([module, scoped]).toEqual([module, !(module in NO_COMPANY_SCOPE)]);
    });

    it.each(controllers.map((c) => [c.module, c.path]))("%s requires authentication", (module, path) => {
        const source = stripComments(readFileSync(path as string, "utf8"));

        expect([module, source.includes("JwtAuthGuard")]).toEqual([module, !(module in PUBLIC)]);
    });

    it("companies is locked to the platform operator", () => {
        // Dropping CompanyGuard without this would make tenant administration
        // reachable by every logged-in user.
        const source = stripComments(
            readFileSync(controllers.find((c) => c.module === "companies")!.path, "utf8"),
        );

        expect(source).toContain("RolesGuard");
        expect(source).toContain("UserRole.SUPER_ADMIN");
    });
});

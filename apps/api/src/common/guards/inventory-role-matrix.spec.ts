import {ROLES_KEY} from "@/common/decorators/roles.decorator";
import {UserRole} from "@/generated/prisma/enums";
import {UnitsController} from "@/modules/units/units.controller";
import {ProjectsController} from "@/modules/projects/projects.controller";
import {BlocksController} from "@/modules/blocks/blocks.controller";
import {EntrancesController} from "@/modules/entrances/entrances.controller";
import {FloorsController} from "@/modules/floors/floors.controller";

/**
 * The inventory hierarchy (projects > blocks > entrances > floors > units) is
 * read-open to every non-SUPER_ADMIN role but write-locked down to
 * COMPANY_ADMIN, with one deliberate exception: SALES_HEAD may also update a
 * unit's details and status. That matrix lives only as scattered @Roles(...)
 * decorators across five controllers — nothing enforces it stays correct as
 * endpoints are added or edited.
 *
 * Rather than re-parsing source text (fragile against reformatting), this
 * reads the same metadata RolesGuard itself reads at runtime: @Roles(...) is
 * `SetMetadata(ROLES_KEY, roles)`, which attaches the role list directly to
 * the handler function via Reflect metadata. Asserting against
 * Controller.prototype.method is therefore checking the exact thing the
 * guard will see, not a proxy for it.
 */
const READ_ROLES = [
    UserRole.COMPANY_ADMIN,
    UserRole.SALES_HEAD,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE,
];

const ADMIN_ONLY = [UserRole.COMPANY_ADMIN];

const ADMIN_AND_SALES_HEAD = [UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD];

type Matrix = Record<string, UserRole[]>;

const MATRICES: {name: string; controller: {prototype: object}; expected: Matrix}[] = [
    {
        name: "ProjectsController",
        controller: ProjectsController,
        expected: {
            findAll: READ_ROLES,
            findOne: READ_ROLES,
            getTree: READ_ROLES,
            create: ADMIN_ONLY,
            update: ADMIN_ONLY,
            remove: ADMIN_ONLY,
        },
    },
    {
        name: "BlocksController",
        controller: BlocksController,
        expected: {
            findByProject: READ_ROLES,
            findOne: READ_ROLES,
            create: ADMIN_ONLY,
            update: ADMIN_ONLY,
            duplicate: ADMIN_ONLY,
            remove: ADMIN_ONLY,
        },
    },
    {
        name: "EntrancesController",
        controller: EntrancesController,
        expected: {
            findByBlock: READ_ROLES,
            findOne: READ_ROLES,
            create: ADMIN_ONLY,
            update: ADMIN_ONLY,
            duplicate: ADMIN_ONLY,
            remove: ADMIN_ONLY,
        },
    },
    {
        name: "FloorsController",
        controller: FloorsController,
        expected: {
            findByEntrance: READ_ROLES,
            findOne: READ_ROLES,
            create: ADMIN_ONLY,
            createBulk: ADMIN_ONLY,
            update: ADMIN_ONLY,
            duplicate: ADMIN_ONLY,
            remove: ADMIN_ONLY,
        },
    },
    {
        name: "UnitsController",
        controller: UnitsController,
        expected: {
            findAll: READ_ROLES,
            findByFloor: READ_ROLES,
            findOne: READ_ROLES,
            create: ADMIN_ONLY,
            createBulk: ADMIN_ONLY,
            // The one deviation from the rest of the hierarchy: a SALES_HEAD
            // may correct a unit's own details and status, but never create,
            // import, duplicate, or delete one.
            update: ADMIN_AND_SALES_HEAD,
            updateStatus: ADMIN_AND_SALES_HEAD,
            importUnits: ADMIN_ONLY,
            duplicate: ADMIN_ONLY,
            remove: ADMIN_ONLY,
        },
    },
];

const sortRoles = (roles: UserRole[]) => [...roles].sort();

describe("inventory role matrix", () => {
    for (const {name, controller, expected} of MATRICES) {
        describe(name, () => {
            const prototype = controller.prototype as Record<string, unknown>;
            const handlerNames = Object.getOwnPropertyNames(prototype).filter(
                (propertyName) => propertyName !== "constructor" && typeof prototype[propertyName] === "function",
            );

            it("has no endpoint left out of the expected matrix, and no stale matrix entry", () => {
                expect(handlerNames.sort()).toEqual(Object.keys(expected).sort());
            });

            it.each(Object.entries(expected))("%s requires exactly %j", (handlerName, expectedRoles) => {
                const actualRoles = Reflect.getMetadata(ROLES_KEY, prototype[handlerName] as object) as
                    | UserRole[]
                    | undefined;

                expect(actualRoles).toBeDefined();
                expect(sortRoles(actualRoles!)).toEqual(sortRoles(expectedRoles));
            });
        });
    }
});

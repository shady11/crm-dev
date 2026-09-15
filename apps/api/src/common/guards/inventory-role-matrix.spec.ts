import {PERMISSIONS_KEY} from "@/common/decorators/permissions.decorator";
import {UnitsController} from "@/modules/units/units.controller";
import {ProjectsController} from "@/modules/projects/projects.controller";
import {BlocksController} from "@/modules/blocks/blocks.controller";
import {EntrancesController} from "@/modules/entrances/entrances.controller";
import {FloorsController} from "@/modules/floors/floors.controller";

/**
 * The inventory hierarchy (projects > blocks > entrances > floors > units) is
 * read-open to every non-SUPER_ADMIN role but write-locked down to
 * COMPANY_ADMIN, with one deliberate exception: SALES_HEAD may also update a
 * unit's details and status (the "units.edit" permission, distinct from
 * "inventory.manage"). That matrix lives only as scattered
 * @RequirePermissions(...) decorators across five controllers — nothing
 * enforces it stays correct as endpoints are added or edited.
 *
 * Rather than re-parsing source text (fragile against reformatting), this
 * reads the same metadata PermissionsGuard itself reads at runtime:
 * @RequirePermissions(...) is `SetMetadata(PERMISSIONS_KEY, permissions)`,
 * which attaches the permission list directly to the handler function via
 * Reflect metadata. Asserting against Controller.prototype.method is
 * therefore checking the exact thing the guard will see, not a proxy for it.
 */
const VIEW = ["inventory.view"];
const MANAGE = ["inventory.manage"];
const UNITS_EDIT = ["units.edit"];
const PROJECTS_VIEW = ["projects.view"];

type Matrix = Record<string, string[]>;

const MATRICES: {name: string; controller: {prototype: object}; expected: Matrix}[] = [
    {
        name: "ProjectsController",
        controller: ProjectsController,
        expected: {
            findAll: PROJECTS_VIEW,
            findOne: PROJECTS_VIEW,
            getTree: PROJECTS_VIEW,
            create: ["projects.create"],
            update: ["projects.edit"],
            remove: ["projects.delete"],
        },
    },
    {
        name: "BlocksController",
        controller: BlocksController,
        expected: {
            findByProject: VIEW,
            findOne: VIEW,
            create: MANAGE,
            update: MANAGE,
            duplicate: MANAGE,
            remove: MANAGE,
        },
    },
    {
        name: "EntrancesController",
        controller: EntrancesController,
        expected: {
            findByBlock: VIEW,
            findOne: VIEW,
            create: MANAGE,
            update: MANAGE,
            duplicate: MANAGE,
            remove: MANAGE,
        },
    },
    {
        name: "FloorsController",
        controller: FloorsController,
        expected: {
            findByEntrance: VIEW,
            findOne: VIEW,
            create: MANAGE,
            createBulk: MANAGE,
            update: MANAGE,
            duplicate: MANAGE,
            remove: MANAGE,
        },
    },
    {
        name: "UnitsController",
        controller: UnitsController,
        expected: {
            findAll: VIEW,
            findByFloor: VIEW,
            findOne: VIEW,
            create: MANAGE,
            createBulk: MANAGE,
            // The one deviation from the rest of the hierarchy: a SALES_HEAD
            // may correct a unit's own details and status, but never create,
            // import, duplicate, or delete one.
            update: UNITS_EDIT,
            updateStatus: UNITS_EDIT,
            importUnits: MANAGE,
            duplicate: MANAGE,
            remove: MANAGE,
        },
    },
];

const sortStrings = (values: string[]) => [...values].sort();

describe("inventory permission matrix", () => {
    for (const {name, controller, expected} of MATRICES) {
        describe(name, () => {
            const prototype = controller.prototype as Record<string, unknown>;
            const handlerNames = Object.getOwnPropertyNames(prototype).filter(
                (propertyName) => propertyName !== "constructor" && typeof prototype[propertyName] === "function",
            );

            it("has no endpoint left out of the expected matrix, and no stale matrix entry", () => {
                expect(handlerNames.sort()).toEqual(Object.keys(expected).sort());
            });

            it.each(Object.entries(expected))("%s requires exactly %j", (handlerName, expectedPermissions) => {
                const actualPermissions = Reflect.getMetadata(PERMISSIONS_KEY, prototype[handlerName] as object) as
                    | string[]
                    | undefined;

                expect(actualPermissions).toBeDefined();
                expect(sortStrings(actualPermissions!)).toEqual(sortStrings(expectedPermissions));
            });
        });
    }
});

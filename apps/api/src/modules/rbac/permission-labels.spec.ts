import {readFileSync} from 'fs';
import {join} from 'path';
import {PERMISSIONS_CATALOG, isPlatformOnlyPermission} from './permissions.catalog';

/**
 * CA-10: the role editor shows each permission's name and description in the
 * reader's language from rbac.json, so a permission added here must be
 * named in every locale, and none named there may be left over.
 */
const LOCALES = ['en', 'ru', 'ky'];

type Catalog = {
    modules: Record<string, string>;
    permissions: Record<string, Record<string, {label: string; description: string}>>;
};

function localeCatalog(lang: string): Catalog {
    const file = join(__dirname, '../../../../web/src/lib/i18n/locales', lang, 'rbac.json');
    return (JSON.parse(readFileSync(file, 'utf8')) as {catalog: Catalog}).catalog;
}

const assignable = PERMISSIONS_CATALOG.filter((p) => !isPlatformOnlyPermission(p.key));

describe.each(LOCALES)('permission names in %s', (lang) => {
    const catalog = localeCatalog(lang);

    it('names every permission a role can be given, with a description', () => {
        const missing = assignable.filter((p) => {
            const entry = catalog.permissions[p.module]?.[p.action];
            return !entry?.label?.trim() || !entry?.description?.trim() || !catalog.modules[p.module]?.trim();
        });
        expect(missing.map((p) => p.key)).toEqual([]);
    });

    it('names nothing the catalog does not offer', () => {
        const offered = new Set(assignable.map((p) => p.key));
        const extra = Object.entries(catalog.permissions)
            .flatMap(([module, actions]) => Object.keys(actions).map((action) => `${module}.${action}`))
            .filter((key) => !offered.has(key));
        expect(extra).toEqual([]);
    });
});

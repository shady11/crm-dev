#!/usr/bin/env node
/**
 * Fails when the locale bundles disagree, when a *_LABEL_KEYS map points at a
 * key that does not exist, or when a namespace on disk was never registered
 * in i18n/index.ts.
 *
 * All three have shipped for real and none was visible in review:
 *   - ru/deals.json was missing two keys en had, so those labels silently
 *     rendered in English on a Russian screen (e85f89d);
 *   - document.types.ts used "documents.type.passport" instead of
 *     "documents:type.passport", so i18next rendered the raw key on screen
 *     (e85f89d);
 *   - documents.json, leads.json and tasks.json existed with correct keys in
 *     both locales, but index.ts never imported them into `resources` — every
 *     t() call in those three namespaces rendered its raw key, in both
 *     languages, everywhere those features were used.
 *
 * i18next never throws for a missing key — it returns the key string — so
 * every one of these classes of bug reaches users unless something checks
 * for it.
 */
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join, basename, relative} from "node:path";

const LOCALES_DIR = "apps/web/src/lib/i18n/locales";
const FEATURES_DIR = "apps/web/src/features";
const I18N_INDEX = "apps/web/src/lib/i18n/index.ts";

const problems = [];

const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
};

const flatten = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );

const locales = readdirSync(LOCALES_DIR);
const bundles = {};
for (const locale of locales) {
    bundles[locale] = {};
    for (const file of readdirSync(join(LOCALES_DIR, locale))) {
        bundles[locale][basename(file, ".json")] = JSON.parse(
            readFileSync(join(LOCALES_DIR, locale, file), "utf8"),
        );
    }
}

// 1. Every namespace and every key exists in every locale.
const [reference, ...others] = locales;
for (const locale of others) {
    for (const ns of Object.keys(bundles[reference])) {
        if (!bundles[locale][ns]) {
            problems.push(`namespace "${ns}" exists in ${reference} but not in ${locale}`);
            continue;
        }
        const a = flatten(bundles[reference][ns]);
        const b = flatten(bundles[locale][ns]);
        for (const key of a) {
            if (!b.includes(key)) problems.push(`${ns}: "${key}" missing in ${locale}`);
        }
        for (const key of b) {
            if (!a.includes(key)) problems.push(`${ns}: "${key}" missing in ${reference}`);
        }
    }
}

// 2. Every namespace on disk is actually registered in i18n/index.ts - a
//    namespace with perfect, fully-translated JSON files is still dead if
//    nothing ever loads it into i18next's `resources`.
const indexSrc = readFileSync(I18N_INDEX, "utf8");
const registeredNamespaces = new Set(
    [...indexSrc.matchAll(/^\s*(\w+):\s*\w+,?\s*$/gm)].map((m) => m[1]),
);
for (const ns of Object.keys(bundles[reference])) {
    if (!registeredNamespaces.has(ns)) {
        problems.push(`namespace "${ns}" has locale files but is not registered in ${I18N_INDEX}`);
    }
}

// 3. Every key referenced by a *_LABEL_KEYS map resolves, in every locale.
const resolve = (locale, ns, path) => {
    let node = bundles[locale][ns];
    for (const part of path.split(".")) {
        if (!node || typeof node !== "object" || !(part in node)) return null;
        node = node[part];
    }
    return typeof node === "string" ? node : null;
};

for (const file of walk(FEATURES_DIR).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
    const src = readFileSync(file, "utf8");
    for (const [, block] of src.matchAll(/(?:export )?const \w*LABEL_KEYS[^}]*\}/g).map((m) => [null, m[0]])) {
        for (const [, key] of block.matchAll(/:\s*"([^"]+)"/g)) {
            const where = relative(process.cwd(), file);
            if (!key.includes(":")) {
                problems.push(`${where}: "${key}" is not namespaced (expected "ns:path")`);
                continue;
            }
            const [ns, path] = key.split(":", 2);
            for (const locale of locales) {
                if (resolve(locale, ns, path) === null) {
                    problems.push(`${where}: "${key}" does not resolve in ${locale}`);
                }
            }
        }
    }
}

if (problems.length > 0) {
    console.error(`Locale check failed with ${problems.length} problem(s):\n`);
    for (const p of problems) console.error("  " + p);
    process.exit(1);
}

console.log(`Locale check passed: ${locales.join(", ")} agree, and every LABEL_KEYS entry resolves.`);

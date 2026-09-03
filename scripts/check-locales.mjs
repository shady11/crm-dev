#!/usr/bin/env node
/**
 * Fails when the locale bundles disagree, or when a *_LABEL_KEYS map points at
 * a key that does not exist.
 *
 * Both of those shipped in e85f89d and neither was visible in review:
 *   - ru/deals.json was missing two keys en had, so those labels silently
 *     rendered in English on a Russian screen;
 *   - document.types.ts used "documents.type.passport" instead of
 *     "documents:type.passport", so i18next rendered the raw key on screen.
 *
 * i18next never throws for a missing key — it returns the key string — so this
 * class of bug reaches users unless something checks for it.
 */
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join, basename, relative} from "node:path";

const LOCALES_DIR = "apps/web/src/lib/i18n/locales";
const FEATURES_DIR = "apps/web/src/features";

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

// 2. Every key referenced by a *_LABEL_KEYS map resolves, in every locale.
const resolve = (locale, ns, path) => {
    let node = bundles[locale][ns];
    for (const part of path.split(".")) {
        if (!node || typeof node !== "object" || !(part in node)) return null;
        node = node[part];
    }
    return typeof node === "string" ? node : null;
};

for (const file of walk(FEATURES_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(file, "utf8");
    for (const [, block] of src.matchAll(/export const \w*LABEL_KEYS[^}]*\}/g).map((m) => [null, m[0]])) {
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

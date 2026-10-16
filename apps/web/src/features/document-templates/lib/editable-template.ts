/**
 * Turns a Handlebars HTML template into a document the visual editor can
 * edit in place, and back.
 *
 * Every {{…}} outside a tag becomes an HTML comment before parsing, so the
 * browser keeps it exactly where it was, even between <tbody> and <tr>,
 * where text would be moved out of the table. Comments that sit where text
 * may go are then shown as locked chips; the rest (inside table structure)
 * stay invisible but are kept. Placeholders inside attributes
 * (src="{{…}}") are left alone and survive as they are.
 */

const MARK = "kerege-hb:";
const CHIP_ATTR = "data-hb";
/** Elements the editor adds for itself; never saved. */
export const EDITOR_ONLY_ATTR = "data-editor-only";

/** Where a <span> chip would break the HTML (the parser would move it). */
const NO_CHIP_PARENTS = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "COLGROUP", "SELECT", "HEAD", "HTML"]);

export type ChipKind = "value" | "open" | "close" | "else" | "comment";

function tokenEnd(html: string, start: number): number {
    if (html.startsWith("{{{", start)) {
        const end = html.indexOf("}}}", start + 3);
        return end < 0 ? -1 : end + 3;
    }
    if (html.startsWith("{{!--", start)) {
        const end = html.indexOf("--}}", start + 5);
        return end < 0 ? -1 : end + 4;
    }
    const end = html.indexOf("}}", start + 2);
    return end < 0 ? -1 : end + 2;
}

const encode = (token: string) => `<!--${MARK}${encodeURIComponent(token)}-->`;

/** Step 1: every {{…}} outside a tag becomes a marker comment. */
export function protectTokens(html: string): string {
    let out = "";
    let i = 0;
    let inTag = false;
    let quote: string | null = null;

    while (i < html.length) {
        const ch = html[i];

        if (inTag) {
            if (quote) {
                if (ch === quote) quote = null;
            } else if (ch === '"' || ch === "'") {
                quote = ch;
            } else if (ch === ">") {
                inTag = false;
            }
            out += ch;
            i += 1;
            continue;
        }

        if (html.startsWith("{{", i)) {
            const end = tokenEnd(html, i);
            if (end > 0) {
                out += encode(html.slice(i, end));
                i = end;
                continue;
            }
        }

        if (html.startsWith("<!--", i)) {
            const close = html.indexOf("-->", i + 4);
            const stop = close < 0 ? html.length : close + 3;
            out += html.slice(i, stop);
            i = stop;
            continue;
        }

        if (ch === "<" && /[a-zA-Z/!?]/.test(html[i + 1] ?? "")) inTag = true;
        out += ch;
        i += 1;
    }

    return out;
}

/** Last step: marker comments back to their {{…}}. */
export function restoreTokens(html: string): string {
    return html.replace(/<!--kerege-hb:([^>]*?)-->/g, (_match, encoded: string) => decodeURIComponent(encoded));
}

export function chipKind(token: string): ChipKind {
    const inner = token.replace(/^\{\{\{?~?\s*/, "");
    if (inner.startsWith("!")) return "comment";
    if (inner.startsWith("#") || inner.startsWith("^")) return "open";
    if (inner.startsWith("/")) return "close";
    if (/^else\b/.test(inner)) return "else";
    return "value";
}

export function createChip(doc: Document, token: string, example?: string): HTMLSpanElement {
    const chip = doc.createElement("span");
    chip.setAttribute(CHIP_ATTR, encodeURIComponent(token));
    chip.setAttribute("contenteditable", "false");
    chip.className = `hb-chip hb-${chipKind(token)}`;
    chip.textContent = token;
    if (example) chip.title = example;
    return chip;
}

/** Step 2, inside the editor frame: marker comments where text may go become chips. */
export function showChips(doc: Document, examples: Map<string, string>) {
    const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_COMMENT);
    const markers: Comment[] = [];
    while (walker.nextNode()) {
        const comment = walker.currentNode as Comment;
        if (comment.data.startsWith(MARK) && comment.parentElement && !NO_CHIP_PARENTS.has(comment.parentElement.tagName)) {
            markers.push(comment);
        }
    }
    for (const comment of markers) {
        const token = decodeURIComponent(comment.data.slice(MARK.length));
        comment.replaceWith(createChip(doc, token, examples.get(token)));
    }
}

/** Placeholder text from the sidebar (may hold several {{…}}) as chips and text. */
export function tokensToNodes(doc: Document, text: string, examples: Map<string, string>): Node[] {
    const nodes: Node[] = [];
    let last = 0;
    let i = text.indexOf("{{");
    while (i >= 0) {
        const end = tokenEnd(text, i);
        if (end < 0) break;
        if (i > last) nodes.push(doc.createTextNode(text.slice(last, i)));
        const token = text.slice(i, end);
        nodes.push(createChip(doc, token, examples.get(token)));
        last = end;
        i = text.indexOf("{{", end);
    }
    if (last < text.length) nodes.push(doc.createTextNode(text.slice(last)));
    return nodes;
}

/** Step 3: the edited frame back to template HTML. */
export function serializeEditable(doc: Document): string {
    const root = doc.documentElement.cloneNode(true) as HTMLElement;

    root.querySelectorAll(`[${EDITOR_ONLY_ATTR}]`).forEach((element) => element.remove());
    root.querySelectorAll(`[${CHIP_ATTR}]`).forEach((chip) => {
        chip.replaceWith(doc.createComment(MARK + chip.getAttribute(CHIP_ATTR)));
    });
    // Formatting commands can leave an empty style="" behind.
    root.querySelectorAll('[style=""]').forEach((element) => element.removeAttribute("style"));
    const body = root.querySelector("body");
    body?.removeAttribute("contenteditable");
    body?.removeAttribute("spellcheck");

    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>\n` : "";
    return restoreTokens(doctype + root.outerHTML);
}

/** A full HTML document with extra markup added first inside <head>. */
export function withHeadMarkup(html: string, markup: string): string {
    const head = /<head[^>]*>/i.exec(html);
    if (head) return html.slice(0, head.index + head[0].length) + markup + html.slice(head.index + head[0].length);
    const root = /<html[^>]*>/i.exec(html);
    if (root) return html.slice(0, root.index + root[0].length) + `<head>${markup}</head>` + html.slice(root.index + root[0].length);
    const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
    return doctype ? doctype[0] + markup + html.slice(doctype[0].length) : markup + html;
}

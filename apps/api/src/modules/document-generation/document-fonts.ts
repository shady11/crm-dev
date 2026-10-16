import { readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Onest — the web app's own typeface (SIL Open Font License) — so generated
 * documents look like the product. The PDF renderer loads nothing but data:
 * URLs (see pdf-renderer.ts), so the font files are embedded as base64,
 * covering Latin and Cyrillic including the Kyrgyz letters (ң, ө, ү).
 *
 * The same CSS goes to the template editor, so what an admin edits and
 * previews uses exactly the font the PDF will.
 */
export const DOCUMENT_FONT_FAMILY = 'Onest';

let cachedCss: string | undefined;

export function documentFontCss(): string {
  if (cachedCss) return cachedCss;

  const packageDir = dirname(
    require.resolve('@fontsource-variable/onest/package.json'),
  );
  const css = readFileSync(join(packageDir, 'index.css'), 'utf8');

  cachedCss = css
    .replace(/'Onest Variable'/g, `'${DOCUMENT_FONT_FAMILY}'`)
    // "block": the PDF is printed once, so it waits for the font rather
    // than printing a fallback and swapping.
    .replace(/font-display: swap/g, 'font-display: block')
    .replace(/url\(\.\/files\/([\w.-]+\.woff2)\)/g, (_match, file: string) => {
      const data = readFileSync(join(packageDir, 'files', file));
      return `url(data:font/woff2;base64,${data.toString('base64')})`;
    });

  return cachedCss;
}

/**
 * Adds the document font to a full HTML document, inside <head> so a
 * template's own styles (which come later) still win.
 */
export function withDocumentFonts(html: string): string {
  const style = `<style>${documentFontCss()}</style>`;

  const head = /<head[^>]*>/i.exec(html);
  if (head) return insertAt(html, head.index + head[0].length, style);

  const root = /<html[^>]*>/i.exec(html);
  if (root) {
    return insertAt(html, root.index + root[0].length, `<head>${style}</head>`);
  }

  // A fragment: keep any doctype first, so the page stays in standards mode.
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  return doctype ? insertAt(html, doctype[0].length, style) : `${style}${html}`;
}

function insertAt(text: string, index: number, insert: string): string {
  return text.slice(0, index) + insert + text.slice(index);
}

import {documentFontCss, withDocumentFonts} from './document-fonts';

describe('document fonts', () => {
    it('embeds Onest as data: URLs, Kyrgyz Cyrillic included, with nothing left to fetch', () => {
        const css = documentFontCss();
        expect(css).toContain("font-family: 'Onest'");
        expect(css).toContain('url(data:font/woff2;base64,');
        expect(css).not.toMatch(/url\(\.\//);
        // ң (U+04A3) and ө (U+04E9) live in the cyrillic-ext block.
        expect(css).toContain('U+0460-052F');
    });

    it('puts the font first inside <head>, so the template\'s own styles still win', () => {
        const html = withDocumentFonts('<!DOCTYPE html><html><head><style>body{}</style></head><body></body></html>');
        expect(html.indexOf('@font-face')).toBeGreaterThan(html.indexOf('<head>'));
        expect(html.indexOf('@font-face')).toBeLessThan(html.indexOf('body{}'));
    });

    it('adds a <head> when the template has none', () => {
        expect(withDocumentFonts('<html><body>x</body></html>')).toMatch(/^<html><head><style>@font-face|^<html><head><style>\/\*/);
    });

    it('keeps the doctype first for a fragment', () => {
        expect(withDocumentFonts('<!DOCTYPE html><p>x</p>')).toMatch(/^<!DOCTYPE html><style>/);
        expect(withDocumentFonts('<p>x</p>')).toMatch(/^<style>[\s\S]*<p>x<\/p>$/);
    });
});

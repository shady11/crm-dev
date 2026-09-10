import { Browser, chromium } from 'playwright';
import { PdfGenerationFailedException } from './exceptions';

/**
 * One browser launch per call. Simplest correct thing for MVP volume — a
 * shared/pooled browser instance is the right move once generation moves
 * onto a queue (see the spec's "headless Chromium under load" risk), not
 * before.
 *
 * PLAYWRIGHT_CHROMIUM_PATH lets a deployment pin an explicit browser binary
 * (this sandbox's pre-installed Chromium is at a revision playwright's
 * default resolution doesn't expect); a normal deployment that has run
 * `npx playwright install chromium` needs neither the env var nor this
 * override.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return pdf;
  } catch (error) {
    throw new PdfGenerationFailedException(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await browser?.close();
  }
}

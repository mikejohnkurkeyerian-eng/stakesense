/**
 * Take full-page screenshots of every public route at desktop + mobile.
 * Output: tests/e2e/screenshots/{viewport}/{name}.png
 *
 * Used to spot UI regressions and to assemble a press kit / submission packet.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname } from "path";

const SITE =
  process.env.STAKESENSE_SITE ||
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";
const SAMPLE_VOTE = "5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU";

const ROUTES = [
  "/",
  "/validators",
  `/validators/${SAMPLE_VOTE}`,
  `/operator/${SAMPLE_VOTE}`,
  "/portfolio",
  "/alerts",
  "/research",
  "/playground",
  "/widget",
  "/integrations/mcp",
  "/data",
  "/about",
  "/methodology",
  "/backtest",
  "/compare",
  "/stake",
  "/stake/multisig",
  "/sponsors",
  "/changelog",
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function shotPath(viewport, route) {
  const slug = route === "/" ? "_home" : route.replace(/^\//, "").replace(/\//g, "-");
  return `tests/e2e/screenshots/${viewport}/${slug}.png`;
}

async function main() {
  console.log(`\n=== Capturing screenshots ===`);
  const browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    console.log(`\n[${vp.name} ${vp.width}x${vp.height}]`);
    for (const route of ROUTES) {
      const url = `${SITE}${route}`;
      const out = shotPath(vp.name, route);
      mkdirSync(dirname(out), { recursive: true });
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        await page.waitForTimeout(2_000);
        await page.screenshot({ path: out, fullPage: true });
        console.log(`  ✅ ${route.padEnd(40)} → ${out}`);
      } catch (e) {
        console.log(`  ❌ ${route.padEnd(40)} ${e.message.slice(0, 80)}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

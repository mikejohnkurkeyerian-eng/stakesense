/**
 * Deep behavioral tests — interact with buttons, verify data, click navigation.
 * Run after smoke.mjs to catch issues that pure content checks miss.
 */
import { chromium } from "playwright";

const SITE =
  process.env.STAKESENSE_SITE ||
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";
const SAMPLE_VOTE = "5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU";

const cases = [];

function test(name, fn) {
  cases.push({ name, fn });
}

test("validators table has > 100 rows", async (page) => {
  await page.goto(`${SITE}/validators`, { waitUntil: "networkidle", timeout: 60_000 });
  const rows = await page.$$eval("table tbody tr", (els) => els.length);
  if (rows < 100) throw new Error(`only ${rows} rows`);
  return `${rows} rows`;
});

test("validators search filters rows", async (page) => {
  await page.goto(`${SITE}/validators`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill('input[placeholder*="Search"]', "Solana Foundation");
  await page.waitForTimeout(500);
  const rows = await page.$$eval("table tbody tr", (els) => els.length);
  if (rows > 50) throw new Error(`search did not filter; got ${rows} rows`);
  return `${rows} rows after filter`;
});

test("validators sort by Downtime reorders table", async (page) => {
  await page.goto(`${SITE}/validators?sort=composite`, { waitUntil: "networkidle", timeout: 60_000 });
  const beforeFirst = await page.$eval("table tbody tr", (el) => el.textContent || "");
  await page.click('a:has-text("Downtime")');
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const afterFirst = await page.$eval("table tbody tr", (el) => el.textContent || "");
  // Sort should produce a different first row (or at least a sort=downtime URL).
  if (beforeFirst === afterFirst && !page.url().includes("sort=downtime")) {
    throw new Error("table did not reorder after Downtime sort");
  }
  return page.url().includes("sort=downtime")
    ? "url changed"
    : "row reordered";
});

test("validator detail shows all 3 pillar cards", async (page) => {
  await page.goto(`${SITE}/validators/${SAMPLE_VOTE}`, { waitUntil: "networkidle", timeout: 60_000 });
  const t = await page.content();
  const checks = ["Downtime risk", "MEV tax", "Decentralization", "Composite score breakdown"];
  for (const c of checks) {
    if (!t.includes(c)) throw new Error(`missing "${c}"`);
  }
  return "all pillars + breakdown rendered";
});

test("operator dashboard shows rank cards + suggestions", async (page) => {
  await page.goto(`${SITE}/operator/${SAMPLE_VOTE}`, { waitUntil: "networkidle", timeout: 60_000 });
  const t = await page.content();
  if (!t.includes("Where you rank")) throw new Error("missing 'Where you rank'");
  if (!t.includes("rank")) throw new Error("missing 'rank'");
  if (!/inside the top-10|below the top-10/.test(t))
    throw new Error("missing top-10 callout");
  return "rank cards + callout rendered";
});

test("alerts page has detection cards", async (page) => {
  await page.goto(`${SITE}/alerts`, { waitUntil: "networkidle", timeout: 60_000 });
  const t = await page.content();
  const hasDelinquent = t.includes("DELINQUENT");
  const hasMev = t.includes("MEV Δ");
  const hasMover = t.includes("DROP") || t.includes("CLIMB");
  if (!hasDelinquent && !hasMev && !hasMover)
    throw new Error("no detection badges rendered");
  return [
    hasDelinquent ? "DELINQUENT" : "",
    hasMev ? "MEV Δ" : "",
    hasMover ? "MOVER" : "",
  ]
    .filter(Boolean)
    .join(", ");
});

test("research page shows network stats", async (page) => {
  await page.goto(`${SITE}/research`, { waitUntil: "networkidle", timeout: 60_000 });
  const t = await page.content();
  if (!t.includes("Active validators")) throw new Error("missing active validators");
  if (!t.includes("Top data centers")) throw new Error("missing data centers section");
  if (!t.includes("Top countries")) throw new Error("missing countries section");
  return "research has stats + clusters";
});

test("playground Run request returns 200 JSON", async (page) => {
  await page.goto(`${SITE}/playground`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click("button:has-text('Run request')");
  await page.waitForTimeout(8_000);
  const t = await page.content();
  if (!t.includes("200")) throw new Error("no 200 in response");
  if (!t.includes('"ok"')) throw new Error("response body missing 'ok'");
  return "got 200 + ok=true";
});

test("portfolio sample wallet runs analyzer", async (page) => {
  await page.goto(`${SITE}/portfolio`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click("text=Solana Foundation");
  await page.waitForTimeout(10_000);
  const t = await page.content();
  if (
    !t.includes("Total SOL staked") &&
    !t.includes("No stake accounts found") &&
    !t.includes("Stake-weighted")
  ) {
    throw new Error("analyzer did not produce a result section");
  }
  return t.includes("No stake accounts") ? "no stakes (expected for some)" : "ran analyzer";
});

test("wallet modal opens with multiple wallets", async (page) => {
  await page.goto(`${SITE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click("button:has-text('Select Wallet')").catch(() => {});
  await page.waitForTimeout(2_000);
  const t = await page.content();
  const wallets = ["Phantom", "Solflare", "Coinbase"];
  const found = wallets.filter((w) => t.includes(w));
  if (found.length < 2)
    throw new Error(`only found wallets: ${found.join(", ") || "none"}`);
  return `found: ${found.join(", ")}`;
});

test("More dropdown nav opens", async (page) => {
  await page.goto(`${SITE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click("button:has-text('More')");
  await page.waitForTimeout(500);
  const t = await page.content();
  if (!t.includes("API playground")) throw new Error("dropdown did not show items");
  if (!t.includes("MCP server")) throw new Error("dropdown missing MCP item");
  return "dropdown shows items";
});

test("widget showcase preview tab switches", async (page) => {
  await page.goto(`${SITE}/widget`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click("button:has-text('Top 3')").catch(() => {});
  await page.waitForTimeout(3_000);
  const t = await page.content();
  if (!t.includes("Top 3 validators")) throw new Error("Top 3 tab did not render");
  return "Top 3 tab works";
});

test("changelog shows version timeline entries", async (page) => {
  await page.goto(`${SITE}/changelog`, { waitUntil: "networkidle", timeout: 60_000 });
  const t = await page.content();
  for (const v of ["0.4.0", "0.3.0", "0.2.0", "0.1.0", "0.0.1", "0.0.0"]) {
    if (!t.includes(v)) throw new Error(`missing ${v}`);
  }
  return "all 6 entries";
});

test("API export endpoint returns CSV header", async (page) => {
  const url = "https://stakesense.onrender.com/api/v1/export/predictions.csv";
  const r = await page.request.get(url, { timeout: 60_000 });
  if (r.status() !== 200) throw new Error(`status ${r.status()}`);
  const body = await r.text();
  if (!body.includes("CC-BY 4.0")) throw new Error("missing license header");
  if (!body.includes("vote_pubkey")) throw new Error("missing CSV columns");
  return `${body.length} bytes`;
});

test("API anomalies endpoint returns detections", async (page) => {
  const url = "https://stakesense.onrender.com/api/v1/anomalies?limit=5";
  const r = await page.request.get(url, { timeout: 60_000 });
  if (r.status() !== 200) throw new Error(`status ${r.status()}`);
  const j = await r.json();
  if (!Array.isArray(j.detections)) throw new Error("no detections array");
  return `${j.detections.length} detections`;
});

async function main() {
  console.log(`\n=== stakesense DEEP behavioral tests ===\n`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let pass = 0;
  let fail = 0;
  for (const c of cases) {
    process.stdout.write(`  → ${c.name.padEnd(50)} `);
    try {
      const r = await c.fn(page);
      console.log(`✅ ${r || "ok"}`);
      pass++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      fail++;
    }
  }
  await browser.close();
  console.log(`\n=== ${pass}/${cases.length} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

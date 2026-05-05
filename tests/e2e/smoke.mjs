/**
 * Comprehensive smoke test of the live stakesense deploy.
 *
 * Walks every route, captures console errors, validates expected content,
 * exercises buttons. Reports a structured pass/fail summary.
 */
import { chromium } from "playwright";

const SITE =
  process.env.STAKESENSE_SITE ||
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";

const SAMPLE_VOTE = "5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU";
const SAMPLE_OWNER = "Hp8eJgxgZuVrcxgzKdLxeTM1dCFr4ZaXJV1DfkhSRWyD";

/**
 * Each test: navigate, wait for an expectation, optionally interact.
 * { path, expect, expectInvisible?, action? }
 */
const TESTS = [
  {
    name: "landing",
    path: "/",
    expect: ["Stake smarter", "Decentralize Solana", "Top picks", "More ways to use", "What changed recently"],
  },
  {
    name: "validators table",
    path: "/validators",
    expect: ["Validators (", "Composite", "Downtime", "MEV"],
    forbid: ["Something broke", "API warming up"],
  },
  {
    name: "validator detail",
    path: `/validators/${SAMPLE_VOTE}`,
    expect: ["Composite score breakdown", "Recent epochs", "Operator view"],
  },
  {
    name: "portfolio",
    path: "/portfolio",
    expect: ["Portfolio analyzer", "Try a sample", "Solana Foundation"],
    action: async (page) => {
      await page.click("text=Solana Foundation");
      await page.waitForTimeout(8000);
      const txt = await page.content();
      const ok =
        txt.includes("No stake accounts found") ||
        txt.includes("Total SOL staked") ||
        txt.includes("Stake-weighted composite");
      return ok ? "Sample wallet ran analyzer" : "Sample wallet click had no effect";
    },
  },
  {
    name: "operator dashboard",
    path: `/operator/${SAMPLE_VOTE}`,
    expect: ["Operator view", "Where you rank", "rank"],
  },
  {
    name: "alerts",
    path: "/alerts",
    expect: ["Recent validator changes"],
  },
  {
    name: "research",
    path: "/research",
    expect: ["State of Solana validators", "Network at a glance"],
  },
  {
    name: "playground",
    path: "/playground",
    expect: ["API playground", "Run request"],
    action: async (page) => {
      await page.click("button:has-text('Run request')");
      await page.waitForTimeout(8000);
      const txt = await page.content();
      const ok =
        txt.includes("Response") &&
        (txt.includes("200") || txt.includes('"ok"'));
      return ok ? "Run request returned 200" : "Run request did not return 200";
    },
  },
  {
    name: "widget showcase",
    path: "/widget",
    expect: ["Embeddable widget", "Quick start", "Live preview"],
  },
  {
    name: "integrations/mcp",
    path: "/integrations/mcp",
    expect: ["MCP integration", "claude mcp add stakesense", "get_validator_score", "get_recent_anomalies"],
  },
  {
    name: "data",
    path: "/data",
    expect: ["Open data", "predictions", "validators", "decentralization", "CC-BY 4.0"],
  },
  {
    name: "about",
    path: "/about",
    expect: ["About stakesense", "Mission", "Public-data ethos"],
  },
  {
    name: "methodology",
    path: "/methodology",
    expect: ["Methodology", "Downtime risk", "MEV tax", "Decentralization"],
  },
  {
    name: "backtest",
    path: "/backtest",
    expect: ["Backtest"],
  },
  {
    name: "compare",
    path: "/compare",
    expect: ["Compare validators"],
  },
  {
    name: "stake",
    path: "/stake",
    expect: ["Stake to a top validator", "Risk profile", "Get recommendations"],
  },
  {
    name: "stake/multisig",
    path: "/stake/multisig",
    expect: ["Multisig stake transaction", "Multisig vault pubkey", "Generate transaction"],
  },
  {
    name: "sponsors",
    path: "/sponsors",
    expect: ["Sponsors", "Phantom", "Privy", "Solana Foundation", "Squads"],
  },
  {
    name: "changelog",
    path: "/changelog",
    expect: ["Changelog", "0.4.0", "0.0.0"],
  },
];

async function runTest(browser, test) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const failedRequests = [];
  page.on("requestfailed", (req) =>
    failedRequests.push(`${req.failure()?.errorText} ${req.url()}`)
  );
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const url = `${SITE}${test.path}`;
  let resp = null;
  let status = null;
  let outcome = "PASS";
  const findings = [];
  const missing = [];
  const forbidden = [];
  let actionResult = null;

  try {
    resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    status = resp ? resp.status() : null;
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    const text = await page.content();

    for (const phrase of test.expect || []) {
      if (!text.includes(phrase)) missing.push(phrase);
    }
    for (const phrase of test.forbid || []) {
      if (text.includes(phrase)) forbidden.push(phrase);
    }

    if (test.action) {
      try {
        actionResult = await test.action(page);
      } catch (e) {
        actionResult = `ACTION_THREW: ${e.message}`;
      }
    }

    if (status >= 400) outcome = "FAIL_HTTP";
    else if (missing.length || forbidden.length) outcome = "FAIL_CONTENT";
    else if (pageErrors.length) outcome = "FAIL_PAGE_ERROR";
    else outcome = "PASS";
  } catch (e) {
    outcome = "FAIL_EXCEPTION";
    findings.push(e.message);
  }

  await ctx.close();
  return {
    name: test.name,
    path: test.path,
    status,
    outcome,
    missing,
    forbidden,
    consoleErrors: consoleErrors.slice(0, 3),
    pageErrors: pageErrors.slice(0, 3),
    actionResult,
    findings,
    failedRequests: failedRequests.slice(0, 5),
  };
}

async function main() {
  console.log(`\n=== stakesense E2E smoke test ===`);
  console.log(`Site: ${SITE}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const test of TESTS) {
    process.stdout.write(`  → ${test.name.padEnd(28)} `);
    const start = Date.now();
    const r = await runTest(browser, test);
    const ms = Date.now() - start;
    const tag =
      r.outcome === "PASS"
        ? "✅ PASS"
        : "❌ " + r.outcome.replace("FAIL_", "");
    console.log(`${tag}  (${ms}ms${r.status ? `, ${r.status}` : ""})`);
    if (r.missing.length) console.log(`     missing: ${r.missing.join(", ")}`);
    if (r.forbidden.length)
      console.log(`     forbidden: ${r.forbidden.join(", ")}`);
    if (r.pageErrors.length)
      console.log(`     pageErrors: ${r.pageErrors[0].slice(0, 200)}`);
    if (r.consoleErrors.length)
      console.log(`     consoleErr: ${r.consoleErrors[0].slice(0, 200)}`);
    if (r.failedRequests.length)
      console.log(`     reqFail: ${r.failedRequests.join(" | ").slice(0, 300)}`);
    if (r.actionResult) console.log(`     action: ${r.actionResult}`);
    if (r.findings.length) console.log(`     ${r.findings.join("; ")}`);
    results.push(r);
  }

  await browser.close();

  const pass = results.filter((r) => r.outcome === "PASS").length;
  const fail = results.length - pass;
  console.log(
    `\n=== Summary: ${pass}/${results.length} passed, ${fail} failing ===`
  );

  if (fail > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((r) => r.outcome !== "PASS")) {
      console.log(`  - ${r.name} (${r.path}): ${r.outcome}`);
      if (r.missing.length) console.log(`      missing: ${r.missing.join(", ")}`);
      if (r.forbidden.length) console.log(`      forbidden: ${r.forbidden.join(", ")}`);
      if (r.pageErrors.length) console.log(`      pageError: ${r.pageErrors[0]}`);
      if (r.actionResult) console.log(`      action: ${r.actionResult}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

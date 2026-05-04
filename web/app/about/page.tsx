import Link from "next/link";

export const metadata = {
  title: "About — stakesense",
  description:
    "Stakesense is an open-source predictive validator quality oracle for Solana. Mission, methodology summary, public-data ethos, and how to contribute.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">About stakesense</h1>
      <p className="text-slate-600 mb-10">
        We score every active Solana mainnet validator across three pillars and
        publish the predictions, the model, the data, and the methodology in
        the open. This page exists so you can decide whether to trust us before
        you stake based on our recommendations.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Mission</h2>
        <p className="text-slate-700 mb-3">
          Solana has roughly 800 active mainnet validators and tens of billions
          of dollars in staked SOL. Choosing where to delegate has direct
          consequences for yield, network decentralization, and slashing risk.
          Today, the data needed to choose well is fragmented across five APIs
          — and none of them predict the future.
        </p>
        <p className="text-slate-700">
          Stakesense fills that gap with an open, auditable scoring oracle,
          available as a dashboard, REST API, MCP server for AI agents, and an
          embeddable widget any wallet or dashboard can drop in.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Three-pillar scoring
        </h2>
        <ul className="text-slate-700 space-y-2 list-disc pl-6">
          <li>
            <strong>Downtime risk</strong> — LightGBM probability of skip-rate
            spike or delinquency in the next 3 epochs.
          </li>
          <li>
            <strong>MEV tax</strong> — fraction of MEV revenue the validator
            keeps for itself versus passes to delegators.
          </li>
          <li>
            <strong>Decentralization</strong> — penalty for sharing data
            center / ASN / country with many others, plus a superminority
            penalty.
          </li>
        </ul>
        <p className="text-slate-700 mt-3">
          The composite is a transparent linear combination:
          <code className="bg-slate-100 px-2 py-0.5 rounded ml-1 text-sm">
            0.5·(1−downtime) + 0.3·(1−mev_tax) + 0.2·decentralization
          </code>
          .
        </p>
        <p className="text-slate-700 mt-3">
          For the long-form details, read the{" "}
          <Link href="/methodology" className="text-violet-700 underline">
            methodology page
          </Link>{" "}
          or the{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/docs/METHODOLOGY.md"
            className="text-violet-700 underline"
          >
            methodology paper on GitHub
          </a>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Public-data ethos
        </h2>
        <p className="text-slate-700 mb-3">
          Validator quality data is the kind of infrastructure that benefits
          Solana most when it&apos;s open and uniform across all consumers. If
          only one wallet has predictive scores, delegators using other wallets
          are systemically disadvantaged. If only one DAO has them, retail
          stakers are disadvantaged.
        </p>
        <ul className="text-slate-700 space-y-2 list-disc pl-6">
          <li>
            <strong>Code:</strong> MIT-licensed, reproducible end-to-end on a
            fresh clone in ~15 minutes.
          </li>
          <li>
            <strong>Data:</strong> CC-BY 4.0. Daily CSV/JSON snapshots at{" "}
            <Link href="/data" className="text-violet-700 underline">
              /data
            </Link>
            .
          </li>
          <li>
            <strong>API:</strong> public, rate-limited free tier. No key
            required for read endpoints.
          </li>
          <li>
            <strong>MCP server:</strong>{" "}
            <Link
              href="/integrations/mcp"
              className="text-violet-700 underline"
            >
              install in Claude Desktop
            </Link>{" "}
            or any MCP-compatible agent.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Who built it</h2>
        <p className="text-slate-700 mb-3">
          Stakesense was built solo by{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng"
            className="text-violet-700 underline"
          >
            Mike
          </a>
          , an AI/ML and full-stack engineer learning Solana on the fly during
          the Solana Frontier hackathon. From the first Solana RPC call to a
          live oracle was about two weeks.
        </p>
        <p className="text-slate-700">
          The author has no validator delegations or partnerships at the time
          of submission, and no validator on the dashboard receives any
          preferential treatment in scoring.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Hackathon disclosure
        </h2>
        <p className="text-slate-700">
          Built for the{" "}
          <a
            href="https://colosseum.com/frontier"
            className="text-violet-700 underline"
          >
            Solana Frontier Hackathon
          </a>
          , 2026-04-06 → 2026-05-11. Targeting the Public Goods $10k tier and
          Standout 20 ($10k) plus sponsor bounties from Phantom, Privy, Squads,
          and the Solana Foundation. The full submission packet is{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/docs/SUBMISSION.md"
            className="text-violet-700 underline"
          >
            on GitHub
          </a>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          How to contribute
        </h2>
        <ul className="text-slate-700 space-y-2 list-disc pl-6">
          <li>
            <strong>Found a bug?</strong> Open an issue on{" "}
            <a
              href="https://github.com/mikejohnkurkeyerian-eng/stakesense/issues"
              className="text-violet-700 underline"
            >
              GitHub Issues
            </a>
            .
          </li>
          <li>
            <strong>Have a feature idea?</strong> PRs welcome. The repo has
            tests; please add coverage with your change.
          </li>
          <li>
            <strong>Want to integrate?</strong> The REST API is at{" "}
            <a
              href="https://stakesense.onrender.com/docs"
              className="text-violet-700 underline"
            >
              /docs
            </a>
            . The widget script and MCP server are documented at{" "}
            <Link href="/data" className="text-violet-700 underline">
              /data
            </Link>{" "}
            and{" "}
            <Link
              href="/integrations/mcp"
              className="text-violet-700 underline"
            >
              /integrations/mcp
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="text-sm text-slate-500 border-t pt-6">
        Stakesense is a public good. Predictions are not investment advice; do
        your own research before staking.
      </section>
    </main>
  );
}

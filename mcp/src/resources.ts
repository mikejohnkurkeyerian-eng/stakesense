/**
 * MCP resource definitions and dispatch.
 *
 * Resources are read-only; agents can list them and read their contents
 * without making "tool calls." We expose the methodology, model card,
 * and the live exports as resources so the agent can pull background
 * context once per conversation rather than re-inferring.
 */
import type { Resource } from "@modelcontextprotocol/sdk/types.js";

import type { StakesenseClient } from "./client.js";

const REPO = "https://github.com/mikejohnkurkeyerian-eng/stakesense";
const RAW = `https://raw.githubusercontent.com/mikejohnkurkeyerian-eng/stakesense/main`;

export const RESOURCES: Resource[] = [
  {
    uri: "stakesense://methodology",
    name: "Methodology paper",
    description:
      "Long-form explanation of the three-pillar scoring system, feature engineering, training process, and limitations.",
    mimeType: "text/markdown",
  },
  {
    uri: "stakesense://model-card",
    name: "Model card",
    description:
      "Technical model documentation: features, training targets, evaluation metrics, and disclosures.",
    mimeType: "text/markdown",
  },
  {
    uri: "stakesense://manifest",
    name: "Open-data export manifest",
    description:
      "Self-describing manifest of the public CC-BY 4.0 datasets stakesense publishes.",
    mimeType: "application/json",
  },
  {
    uri: "stakesense://network-stats",
    name: "Latest network stats",
    description:
      "Current network-wide summary: averages, totals, latest epoch, Nakamoto coefficient.",
    mimeType: "application/json",
  },
  {
    uri: "stakesense://decentralization",
    name: "Decentralization snapshot",
    description:
      "Latest concentration breakdown by data center, ASN, and country plus Nakamoto coefficient.",
    mimeType: "application/json",
  },
];

export async function readResource(
  client: StakesenseClient,
  uri: string,
): Promise<{ mimeType: string; text: string }> {
  switch (uri) {
    case "stakesense://methodology": {
      const r = await fetch(`${RAW}/docs/METHODOLOGY.md`);
      const text = await r.text();
      return { mimeType: "text/markdown", text };
    }
    case "stakesense://model-card": {
      const r = await fetch(`${RAW}/MODEL_CARD.md`);
      const text = await r.text();
      return { mimeType: "text/markdown", text };
    }
    case "stakesense://manifest": {
      const data = await client.exportManifest();
      return {
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      };
    }
    case "stakesense://network-stats": {
      const data = await client.stats();
      return {
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      };
    }
    case "stakesense://decentralization": {
      const data = await client.decentralizationSnapshot();
      return {
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      };
    }
    default:
      throw new Error(`unknown resource: ${uri} (try ${REPO})`);
  }
}

/**
 * MCP tool definitions and dispatch.
 *
 * Each tool advertises a JSON-Schema input shape (Anthropic uses these
 * directly) and a callable that delegates to the REST client.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import type { StakesenseClient } from "./client.js";

export const TOOLS: Tool[] = [
  {
    name: "get_validator_score",
    description:
      "Get the latest predicted scores for a specific Solana validator by vote pubkey. " +
      "Returns composite, downtime_prob_7d, mev_tax_rate, decentralization_score, plus " +
      "metadata (name, commission, stake, data center, country) and recent epoch history.",
    inputSchema: {
      type: "object",
      properties: {
        vote_pubkey: {
          type: "string",
          description: "Validator vote account pubkey (base58)",
        },
      },
      required: ["vote_pubkey"],
    },
  },
  {
    name: "recommend_top_validators",
    description:
      "Recommend the top-N Solana validators for a delegator given a SOL amount and risk " +
      "profile (conservative, balanced, aggressive). Returns ranked recommendations with " +
      "composite scores and pillar breakdowns. Use this when a user asks 'where should I stake?'",
    inputSchema: {
      type: "object",
      properties: {
        amount_sol: {
          type: "number",
          description: "Amount of SOL the user wants to delegate",
          minimum: 0.001,
        },
        risk_profile: {
          type: "string",
          enum: ["conservative", "balanced", "aggressive"],
          description: "Risk preference (default: balanced)",
        },
        count: {
          type: "integer",
          description: "Number of validators to return (default: 5, max: 20)",
          minimum: 1,
          maximum: 20,
        },
      },
      required: ["amount_sol"],
    },
  },
  {
    name: "list_validators",
    description:
      "List validators sorted by a chosen pillar. Use for browsing the top of any " +
      "single dimension (composite, downtime, mev_tax, decentralization).",
    inputSchema: {
      type: "object",
      properties: {
        sort: {
          type: "string",
          enum: ["composite", "downtime", "mev_tax", "decentralization"],
          description: "Sort key (default: composite, descending best-first)",
        },
        limit: {
          type: "integer",
          description: "Max rows (default: 25, max: 200)",
          minimum: 1,
          maximum: 200,
        },
        offset: {
          type: "integer",
          description: "Pagination offset",
          minimum: 0,
        },
      },
    },
  },
  {
    name: "get_validator_history",
    description:
      "Get the per-day prediction history for a validator (composite + pillar scores over time). " +
      "Useful for trajectory questions like 'is this validator getting better or worse?'",
    inputSchema: {
      type: "object",
      properties: {
        vote_pubkey: {
          type: "string",
          description: "Validator vote account pubkey (base58)",
        },
        limit: {
          type: "integer",
          description: "Number of historical predictions (default: 30, max: 180)",
          minimum: 1,
          maximum: 180,
        },
      },
      required: ["vote_pubkey"],
    },
  },
  {
    name: "get_decentralization_report",
    description:
      "Get the network-wide decentralization snapshot: Nakamoto coefficient, total " +
      "stake, and concentration breakdowns by data center, ASN, and country. Use for " +
      "questions about Solana network health, decentralization trends, or comparing " +
      "to other chains.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_concentration_by",
    description:
      "Get top clusters along a specific axis (data_center, asn, or country) — which " +
      "buckets hold the most validators / stake. Useful for answering 'which data " +
      "center hosts the most Solana validators?'",
    inputSchema: {
      type: "object",
      properties: {
        by: {
          type: "string",
          enum: ["data_center", "asn", "country"],
          description: "Axis to group by",
        },
        top: {
          type: "integer",
          description: "Number of top clusters (default: 15, max: 50)",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["by"],
    },
  },
  {
    name: "get_network_stats",
    description:
      "Get the current network-level summary: average composite, average downtime " +
      "probability, average MEV tax, average decentralization, latest epoch, latest " +
      "prediction date, and Nakamoto coefficient. Good high-level snapshot.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "health_check",
    description:
      "Lightweight ping — confirms the stakesense API is up and returns last update " +
      "epoch, last prediction date, and active model version. Use to verify freshness.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function callTool(
  client: StakesenseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_validator_score": {
      const pk = required(args, "vote_pubkey");
      return client.getValidator(String(pk));
    }
    case "recommend_top_validators": {
      const amount_sol = Number(required(args, "amount_sol"));
      const risk_profile = (args.risk_profile as
        | "conservative"
        | "balanced"
        | "aggressive"
        | undefined) ?? "balanced";
      const count = args.count ? Number(args.count) : 5;
      return client.recommend({ amount_sol, risk_profile, count });
    }
    case "list_validators": {
      const sort = (args.sort as
        | "composite"
        | "downtime"
        | "mev_tax"
        | "decentralization"
        | undefined) ?? "composite";
      const limit = args.limit ? Number(args.limit) : 25;
      const offset = args.offset ? Number(args.offset) : 0;
      return client.listValidators({ sort, limit, offset });
    }
    case "get_validator_history": {
      const pk = String(required(args, "vote_pubkey"));
      const limit = args.limit ? Number(args.limit) : 30;
      return client.validatorPredictions(pk, limit);
    }
    case "get_decentralization_report": {
      return client.decentralizationSnapshot();
    }
    case "get_concentration_by": {
      const by = String(required(args, "by")) as "data_center" | "asn" | "country";
      const top = args.top ? Number(args.top) : 15;
      return client.clusters(by, top);
    }
    case "get_network_stats": {
      return client.stats();
    }
    case "health_check": {
      return client.health();
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function required(args: Record<string, unknown>, key: string): unknown {
  if (args[key] === undefined || args[key] === null) {
    throw new Error(`missing required argument: ${key}`);
  }
  return args[key];
}

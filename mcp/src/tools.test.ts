/**
 * Tests for MCP tool dispatch. Uses a fake StakesenseClient so we can verify
 * argument shapes without hitting the live API.
 */
import { describe, expect, it, vi } from "vitest";

import type { StakesenseClient } from "./client.js";
import { TOOLS, callTool } from "./tools.js";

function makeFakeClient(): StakesenseClient {
  return {
    health: vi.fn().mockResolvedValue({ ok: true, last_update_epoch: 966 }),
    stats: vi.fn().mockResolvedValue({ active_validators: 789, nakamoto_coefficient: 22 }),
    listValidators: vi.fn().mockResolvedValue({ results: [], total: 0, limit: 25, offset: 0 }),
    getValidator: vi.fn().mockResolvedValue({ validator: { vote_pubkey: "abc" }, history: [] }),
    validatorPredictions: vi.fn().mockResolvedValue({ vote_pubkey: "abc", history: [] }),
    recommend: vi.fn().mockResolvedValue({ recommendations: [] }),
    clusters: vi.fn().mockResolvedValue({ by: "data_center", clusters: [] }),
    decentralizationSnapshot: vi.fn().mockResolvedValue({
      license: "CC-BY 4.0",
      attribution: "stakesense",
      generated_at: "2026-05-04T00:00:00Z",
      nakamoto_coefficient: 22,
      total_stake: 0,
      clusters: { data_center: [], asn: [], country: [] },
    }),
    exportManifest: vi.fn().mockResolvedValue({ exports: [] }),
    validatorRank: vi.fn().mockResolvedValue({
      vote_pubkey: "abc",
      total_validators: 789,
      rank_composite: 5,
      rank_downtime: 8,
      rank_mev_tax: 3,
      rank_decentralization: 200,
      percentile_composite: 0.99,
      current_composite: 0.95,
      current_downtime_prob: 0.05,
      current_mev_tax: 0.04,
      current_decentralization: 0.6,
      cutoff_top10_composite: 0.96,
      cutoff_top50_composite: 0.92,
      cutoff_top100_composite: 0.88,
      gap_to_top10: 0.01,
      gap_to_top50: -0.03,
    }),
    anomalies: vi.fn().mockResolvedValue({ detections: [] }),
  } as unknown as StakesenseClient;
}

describe("TOOLS catalog", () => {
  it("exposes the ten expected tools", () => {
    const names = TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_concentration_by",
      "get_decentralization_report",
      "get_network_stats",
      "get_recent_anomalies",
      "get_validator_history",
      "get_validator_rank",
      "get_validator_score",
      "health_check",
      "list_validators",
      "recommend_top_validators",
    ]);
  });

  it("each tool has a non-empty description and JSON-Schema input shape", () => {
    for (const t of TOOLS) {
      expect(t.description).toBeTruthy();
      expect(t.inputSchema).toBeDefined();
      expect((t.inputSchema as { type?: string }).type).toBe("object");
    }
  });
});

describe("callTool dispatch", () => {
  it("get_validator_score routes to client.getValidator", async () => {
    const c = makeFakeClient();
    const out = await callTool(c, "get_validator_score", { vote_pubkey: "abc" });
    expect(c.getValidator).toHaveBeenCalledWith("abc");
    expect(out).toEqual({ validator: { vote_pubkey: "abc" }, history: [] });
  });

  it("recommend_top_validators uses defaults when not given", async () => {
    const c = makeFakeClient();
    await callTool(c, "recommend_top_validators", { amount_sol: 50 });
    expect(c.recommend).toHaveBeenCalledWith({
      amount_sol: 50,
      risk_profile: "balanced",
      count: 5,
    });
  });

  it("recommend_top_validators forwards profile and count", async () => {
    const c = makeFakeClient();
    await callTool(c, "recommend_top_validators", {
      amount_sol: 100,
      risk_profile: "aggressive",
      count: 10,
    });
    expect(c.recommend).toHaveBeenCalledWith({
      amount_sol: 100,
      risk_profile: "aggressive",
      count: 10,
    });
  });

  it("list_validators uses default sort=composite", async () => {
    const c = makeFakeClient();
    await callTool(c, "list_validators", {});
    expect(c.listValidators).toHaveBeenCalledWith({
      sort: "composite",
      limit: 25,
      offset: 0,
    });
  });

  it("get_validator_history default limit is 30", async () => {
    const c = makeFakeClient();
    await callTool(c, "get_validator_history", { vote_pubkey: "abc" });
    expect(c.validatorPredictions).toHaveBeenCalledWith("abc", 30);
  });

  it("get_concentration_by default top is 15", async () => {
    const c = makeFakeClient();
    await callTool(c, "get_concentration_by", { by: "asn" });
    expect(c.clusters).toHaveBeenCalledWith("asn", 15);
  });

  it("get_decentralization_report calls decentralizationSnapshot", async () => {
    const c = makeFakeClient();
    const r = await callTool(c, "get_decentralization_report", {});
    expect(c.decentralizationSnapshot).toHaveBeenCalled();
    expect((r as { license: string }).license).toBe("CC-BY 4.0");
  });

  it("get_network_stats calls stats", async () => {
    const c = makeFakeClient();
    await callTool(c, "get_network_stats", {});
    expect(c.stats).toHaveBeenCalled();
  });

  it("health_check calls health", async () => {
    const c = makeFakeClient();
    await callTool(c, "health_check", {});
    expect(c.health).toHaveBeenCalled();
  });

  it("missing required argument throws", async () => {
    const c = makeFakeClient();
    await expect(
      callTool(c, "get_validator_score", {}),
    ).rejects.toThrow(/missing required argument: vote_pubkey/);
  });

  it("get_validator_rank routes to client.validatorRank", async () => {
    const c = makeFakeClient();
    const out = await callTool(c, "get_validator_rank", { vote_pubkey: "abc" });
    expect(c.validatorRank).toHaveBeenCalledWith("abc");
    expect((out as { rank_composite: number }).rank_composite).toBe(5);
  });

  it("get_recent_anomalies default limit is 20", async () => {
    const c = makeFakeClient();
    await callTool(c, "get_recent_anomalies", {});
    expect(c.anomalies).toHaveBeenCalledWith(20);
  });

  it("unknown tool throws", async () => {
    const c = makeFakeClient();
    await expect(callTool(c, "nope", {})).rejects.toThrow(/unknown tool/);
  });
});

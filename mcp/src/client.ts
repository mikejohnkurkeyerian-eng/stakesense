/** Thin HTTP client for the stakesense REST API. */

const DEFAULT_BASE = "https://stakesense.onrender.com";

export class StakesenseClient {
  constructor(private readonly base: string = DEFAULT_BASE) {}

  private async get<T>(path: string): Promise<T> {
    const url = `${this.base}${path}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "stakesense-mcp/0.1.0" },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`stakesense ${path} → ${r.status}: ${body.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const url = `${this.base}${path}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "stakesense-mcp/0.1.0",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`stakesense ${path} → ${r.status}: ${body.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  }

  health(): Promise<HealthResponse> {
    return this.get("/api/v1/health");
  }

  stats(): Promise<StatsResponse> {
    return this.get("/api/v1/validators/stats");
  }

  listValidators(opts: {
    sort?: "composite" | "downtime" | "mev_tax" | "decentralization";
    limit?: number;
    offset?: number;
  } = {}): Promise<ListResponse> {
    const qs = new URLSearchParams();
    if (opts.sort) qs.set("sort", opts.sort);
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const q = qs.toString();
    return this.get(`/api/v1/validators${q ? `?${q}` : ""}`);
  }

  getValidator(votePubkey: string): Promise<ValidatorDetail> {
    return this.get(`/api/v1/validators/${encodeURIComponent(votePubkey)}`);
  }

  validatorPredictions(votePubkey: string, limit = 30): Promise<{
    vote_pubkey: string;
    history: PredictionRow[];
  }> {
    return this.get(
      `/api/v1/validators/${encodeURIComponent(votePubkey)}/predictions?limit=${limit}`,
    );
  }

  recommend(opts: {
    amount_sol: number;
    risk_profile?: "conservative" | "balanced" | "aggressive";
    count?: number;
  }): Promise<RecommendResponse> {
    return this.post("/api/v1/recommend", {
      amount_sol: opts.amount_sol,
      risk_profile: opts.risk_profile ?? "balanced",
      count: opts.count ?? 5,
    });
  }

  clusters(by: "data_center" | "asn" | "country", top = 15): Promise<ClustersResponse> {
    return this.get(`/api/v1/validators/clusters?by=${by}&top=${top}`);
  }

  decentralizationSnapshot(): Promise<DecentralizationSnapshot> {
    return this.get("/api/v1/export/decentralization.json");
  }

  exportManifest(): Promise<ExportManifest> {
    return this.get("/api/v1/export/manifest.json");
  }

  validatorRank(votePubkey: string): Promise<RankResponse> {
    return this.get(`/api/v1/validators/${encodeURIComponent(votePubkey)}/rank`);
  }

  anomalies(limit = 20): Promise<AnomaliesResponse> {
    return this.get(`/api/v1/anomalies?limit=${limit}`);
  }
}

// ----- Types (mirror the REST shapes) -----

export interface HealthResponse {
  ok: boolean;
  last_update_epoch: number | null;
  last_prediction_date: string | null;
  model_version: string | null;
}

export interface StatsResponse {
  avg_mev_tax: number | null;
  avg_downtime_prob: number | null;
  avg_decentralization: number | null;
  avg_composite: number | null;
  total_scored: number;
  active_validators: number;
  latest_epoch: number | null;
  latest_prediction_date: string | null;
  nakamoto_coefficient: number | null;
}

export interface ValidatorRow {
  vote_pubkey: string;
  name: string | null;
  commission_pct: number | null;
  active_stake: number | null;
  data_center: string | null;
  country: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
}

export interface ListResponse {
  results: ValidatorRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ValidatorDetail {
  validator: Record<string, unknown>;
  history: Array<Record<string, unknown>>;
}

export interface PredictionRow {
  prediction_date: string;
  model_version: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
}

export interface Recommendation {
  vote_pubkey: string;
  name: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
  reasoning: string | null;
}

export interface RecommendResponse {
  recommendations: Recommendation[];
  amount_sol?: number;
  risk_profile?: string;
}

export interface ClusterRow {
  cluster: string;
  n_validators: number;
  total_stake: number | null;
}

export interface ClustersResponse {
  by: string;
  clusters: ClusterRow[];
}

export interface DecentralizationSnapshot {
  license: string;
  attribution: string;
  generated_at: string;
  nakamoto_coefficient: number | null;
  total_stake: number | null;
  clusters: {
    data_center: ClusterRow[];
    asn: ClusterRow[];
    country: ClusterRow[];
  };
}

export interface ExportManifest {
  license: string;
  attribution: string;
  generated_at: string;
  schema_version: string;
  exports: Array<{
    id: string;
    url: string;
    json_url?: string;
    description: string;
    refresh: string;
    fields: string[];
  }>;
}

export interface RankResponse {
  vote_pubkey: string;
  total_validators: number;
  rank_composite: number;
  rank_downtime: number;
  rank_mev_tax: number;
  rank_decentralization: number;
  percentile_composite: number | null;
  current_composite: number | null;
  current_downtime_prob: number | null;
  current_mev_tax: number | null;
  current_decentralization: number | null;
  cutoff_top10_composite: number | null;
  cutoff_top50_composite: number | null;
  cutoff_top100_composite: number | null;
  gap_to_top10: number | null;
  gap_to_top50: number | null;
}

export interface AnomalyDetection {
  kind: string;
  vote_pubkey: string;
  name: string | null;
  magnitude: number;
  summary: string;
  epoch?: number;
  current_date?: string;
}

export interface AnomaliesResponse {
  detections: AnomalyDetection[];
}

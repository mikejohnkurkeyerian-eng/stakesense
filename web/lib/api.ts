import type { Validator, ValidatorDetail, RecommendResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export async function listValidators(params: {
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  );
  return get<{ results: Validator[]; total: number }>(
    `/api/v1/validators?${qs.toString()}`
  );
}

export async function getValidator(votePubkey: string) {
  return get<ValidatorDetail>(`/api/v1/validators/${votePubkey}`);
}

export async function recommend(body: {
  amount_sol: number;
  risk_profile: string;
  count?: number;
}) {
  const r = await fetch(`${BASE}/api/v1/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`recommend failed: ${r.status}`);
  return r.json() as Promise<RecommendResponse>;
}

export async function getBacktest(epochs = 90) {
  return get<{ yields: unknown[]; incidents: unknown[]; summary: unknown }>(
    `/api/v1/backtest?epochs=${epochs}`
  );
}

export type PredictionPoint = {
  prediction_date: string;
  model_version: string;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
};

export async function getPredictionHistory(votePubkey: string, limit = 30) {
  return get<{ vote_pubkey: string; history: PredictionPoint[] }>(
    `/api/v1/validators/${votePubkey}/predictions?limit=${limit}`
  );
}

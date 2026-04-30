export type Validator = {
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
};

export type EpochPerf = {
  epoch: number;
  skip_rate: number | null;
  vote_latency: number | null;
  credits: number | null;
  active_stake: number | null;
  delinquent: boolean;
};

export type ValidatorDetail = {
  validator: Validator & { identity_pubkey: string | null; asn: string | null };
  history: EpochPerf[];
};

export type Recommendation = Validator & { reasoning: string };

export type RecommendResponse = {
  amount_sol: number;
  risk_profile: string;
  recommendations: Recommendation[];
};

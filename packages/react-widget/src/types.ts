export interface ValidatorScoreProps {
  /** Validator vote pubkey (base58) */
  votePubkey: string;
  /** API base, defaults to the public stakesense Render deploy */
  apiBase?: string;
  /** "light" | "dark" — visual theme */
  theme?: "light" | "dark";
  /** "full" or "compact" layout */
  size?: "full" | "compact";
  /** Optional className passed through to the outer container */
  className?: string;
}

export interface TopValidatorsProps {
  /** How many validators to show (default 5) */
  count?: number;
  /** Sort axis */
  sort?: "composite" | "downtime" | "mev_tax" | "decentralization";
  /** API base, defaults to the public stakesense Render deploy */
  apiBase?: string;
  theme?: "light" | "dark";
  className?: string;
}

export interface ValidatorRow {
  vote_pubkey: string;
  name: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
  data_center: string | null;
  country: string | null;
}

export interface ValidatorDetailRow {
  validator: ValidatorRow;
}

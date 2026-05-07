"use client";

import { useState } from "react";

type Metric = "composite_score" | "downtime_prob_7d" | "mev_tax_rate" | "decentralization_score";
type WebhookKind = "discord" | "slack" | "generic";
type Comparator = "lt" | "gt";

const PRESETS: Array<{
  label: string;
  metric: Metric;
  comparator: Comparator;
  threshold: number;
  hint: string;
}> = [
  {
    label: "Alert if composite drops below 0.7",
    metric: "composite_score",
    comparator: "lt",
    threshold: 0.7,
    hint: "Catch broad scoring slips early.",
  },
  {
    label: "Alert if downtime risk exceeds 10%",
    metric: "downtime_prob_7d",
    comparator: "gt",
    threshold: 0.1,
    hint: "Get pinged when the model raises a flag.",
  },
  {
    label: "Alert if decentralization slips below 0.5",
    metric: "decentralization_score",
    comparator: "lt",
    threshold: 0.5,
    hint: "Track host/cluster concentration changes.",
  },
];

const PRETTY_METRIC: Record<Metric, string> = {
  composite_score: "Composite",
  downtime_prob_7d: "Downtime risk",
  mev_tax_rate: "MEV tax",
  decentralization_score: "Decentralization",
};

export default function OperatorWatchOptIn({ votePubkey }: { votePubkey: string }) {
  const [open, setOpen] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [webhookKind, setWebhookKind] = useState<WebhookKind>("discord");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; label: string } | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const preset = PRESETS[presetIdx];
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vote_pubkey: votePubkey,
          webhook_url: webhookUrl,
          webhook_kind: webhookKind,
          metric: preset.metric,
          comparator: preset.comparator,
          threshold: preset.threshold,
          label: label || `${PRETTY_METRIC[preset.metric]} alert`,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j);
        throw new Error(detail);
      }
      setSuccess({ id: j.id, label: j.label || PRETTY_METRIC[preset.metric] });
      setWebhookUrl("");
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register watch");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="border rounded-lg p-5 bg-emerald-50 border-emerald-200 mb-10">
        <div className="font-semibold text-emerald-900 mb-1">
          ✓ Watch #{success.id} registered: {success.label}
        </div>
        <p className="text-sm text-emerald-800">
          Your webhook will be pinged after each cron run if the threshold trips.
          Watches are de-duplicated per validator + metric so you won&apos;t get spammed.
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="mt-3 text-sm text-emerald-900 underline"
        >
          Add another
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="border rounded-lg p-5 bg-violet-50 border-violet-200 mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-1">
              Watch this validator → get an alert when something changes
            </h2>
            <p className="text-sm text-slate-700">
              Operators: subscribe a Discord, Slack, or generic webhook to anomaly
              alerts on your own pubkey. No account, no tokens — just a webhook URL.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 px-3 py-2 bg-violet-700 text-white rounded text-sm font-medium hover:bg-violet-800"
          >
            Set up alert
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="border rounded-lg p-5 bg-violet-50 border-violet-200 mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold">Set up an alert</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-600 block mb-1">
            Trigger
          </label>
          <select
            value={presetIdx}
            onChange={(e) => setPresetIdx(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm bg-white"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            {PRESETS[presetIdx].hint}
          </p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-600 block mb-1">
            Webhook destination
          </label>
          <div className="flex gap-2">
            <select
              value={webhookKind}
              onChange={(e) => setWebhookKind(e.target.value as WebhookKind)}
              className="border rounded px-2 py-2 text-sm bg-white shrink-0"
            >
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
              <option value="generic">Generic JSON POST</option>
            </select>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value.trim())}
              placeholder="https://discord.com/api/webhooks/…"
              className="flex-1 border rounded px-3 py-2 text-sm font-mono"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Your URL is stored encrypted at rest and never returned via the API.
          </p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-600 block mb-1">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. ops-team alerts"
            maxLength={80}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="border-l-4 border-red-500 bg-red-50 p-3 rounded text-sm text-red-900">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || !webhookUrl}
          className="w-full px-4 py-2 bg-violet-700 text-white rounded font-medium hover:bg-violet-800 disabled:opacity-50"
        >
          {submitting ? "Registering…" : "Register watch"}
        </button>
      </div>
    </section>
  );
}

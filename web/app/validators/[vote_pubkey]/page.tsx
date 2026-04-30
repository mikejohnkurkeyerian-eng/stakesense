import { getValidator } from "@/lib/api";

export default async function Page({
  params,
}: {
  params: Promise<{ vote_pubkey: string }>;
}) {
  const p = await params;
  const data = await getValidator(p.vote_pubkey);
  const v = data.validator;
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{v.name ?? v.vote_pubkey}</h1>
      <p className="text-slate-500 mb-4 break-all">{v.vote_pubkey}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">Downtime risk (next 7d)</div>
          <div className="text-3xl font-semibold">
            {((v.downtime_prob_7d ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">MEV tax (next 7d)</div>
          <div className="text-3xl font-semibold">
            {((v.mev_tax_rate ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">Decentralization score</div>
          <div className="text-3xl font-semibold">
            {(v.decentralization_score ?? 0).toFixed(3)}
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Last 90 epochs</h2>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Epoch</th>
              <th className="text-right p-2">Skip rate</th>
              <th className="text-right p-2">Vote latency</th>
              <th className="text-right p-2">Credits</th>
              <th className="text-right p-2">Stake</th>
              <th className="text-right p-2">Delinquent</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((h) => (
              <tr key={h.epoch} className="border-t">
                <td className="p-2">{h.epoch}</td>
                <td className="p-2 text-right">
                  {((h.skip_rate ?? 0) * 100).toFixed(2)}%
                </td>
                <td className="p-2 text-right">
                  {(h.vote_latency ?? 0).toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  {h.credits?.toLocaleString() ?? "—"}
                </td>
                <td className="p-2 text-right">
                  {h.active_stake?.toLocaleString() ?? "—"}
                </td>
                <td className="p-2 text-right">
                  {h.delinquent ? "yes" : "no"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

"use client";

import {
  Authorized,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  StakeProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";
import Link from "next/link";
import { useState } from "react";

import type { Recommendation } from "@/lib/types";
import { recommend } from "@/lib/api";

type Network = "devnet" | "mainnet-beta";

const NETWORK_RPC: Record<Network, string> = {
  devnet: clusterApiUrl("devnet"),
  "mainnet-beta": clusterApiUrl("mainnet-beta"),
};

export default function MultisigStakePage() {
  const [multisigVault, setMultisigVault] = useState("");
  const [amountSol, setAmountSol] = useState("100");
  const [network, setNetwork] = useState<Network>("devnet");
  const [picks, setPicks] = useState<Recommendation[] | null>(null);
  const [chosen, setChosen] = useState<Recommendation | null>(null);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [generated, setGenerated] = useState<{
    base58: string;
    base64: string;
    stakeAccountPubkey: string;
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function fetchPicks() {
    const amt = Number(amountSol);
    if (!amt || amt <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }
    setLoadingPicks(true);
    setError(null);
    setPicks(null);
    setChosen(null);
    try {
      const r = await recommend({
        amount_sol: amt,
        risk_profile: "balanced",
        count: 5,
      });
      setPicks(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch recommendations");
    } finally {
      setLoadingPicks(false);
    }
  }

  async function generateTransaction() {
    setError(null);
    setGenerated(null);
    if (!multisigVault) {
      setError("Enter the multisig vault pubkey");
      return;
    }
    if (!chosen) {
      setError("Pick a recommended validator");
      return;
    }
    const amt = Number(amountSol);
    if (!amt || amt <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }

    setWorking(true);
    try {
      const vault = new PublicKey(multisigVault);
      const voter = new PublicKey(chosen.vote_pubkey);
      const lamports = Math.floor(amt * LAMPORTS_PER_SOL);

      const conn = new Connection(NETWORK_RPC[network], "confirmed");
      const minRent = await conn.getMinimumBalanceForRentExemption(
        StakeProgram.space
      );
      if (lamports < minRent) {
        throw new Error(
          `Amount too small — minimum is ~${(minRent / LAMPORTS_PER_SOL).toFixed(4)} SOL for stake-account rent exemption.`
        );
      }

      const stakeAccount = Keypair.generate();

      const createIx = StakeProgram.createAccount({
        fromPubkey: vault, // multisig vault funds the stake account
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(vault, vault), // staker + withdrawer = vault
        lamports,
      });

      const delegateIx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: vault,
        votePubkey: voter,
      });

      const { blockhash } = await conn.getLatestBlockhash("finalized");

      const tx = new Transaction({
        feePayer: vault,
        recentBlockhash: blockhash,
      });
      tx.add(createIx, delegateIx);

      // The stake account keypair must sign the create_account instruction (in
      // addition to the multisig vault). We partial-sign with it here so the
      // multisig only needs to add its own approval afterward.
      tx.partialSign(stakeAccount);

      const serialized = tx.serialize({ requireAllSignatures: false });
      const summary = [
        `Network: ${network}`,
        `From multisig: ${multisigVault}`,
        `Stake account: ${stakeAccount.publicKey.toBase58()}`,
        `Validator: ${chosen.name || chosen.vote_pubkey} (composite ${(chosen.composite_score ? chosen.composite_score * 100 : 0).toFixed(1)}%)`,
        `Amount: ${amt} SOL (${lamports} lamports)`,
        `Rent floor: ${(minRent / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
      ].join("\n");

      setGenerated({
        base58: bs58.encode(serialized),
        base64: serialized.toString("base64"),
        stakeAccountPubkey: stakeAccount.publicKey.toBase58(),
        summary,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to construct transaction");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <Link
        href="/stake"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← /stake (single-signer)
      </Link>
      <h1 className="text-3xl font-bold mb-2">Multisig stake transaction</h1>
      <p className="text-slate-600 mb-6">
        Generate a Solana stake-account creation + delegation transaction for a
        multisig vault. The output is a serialized transaction blob you can
        paste into Squads, Realms, or any multisig UI to propose to your council.
      </p>

      <section className="border rounded-lg p-5 bg-violet-50 border-violet-200 mb-6 text-sm text-violet-900">
        <strong>Read-only generator.</strong> This page does not connect to
        your wallet, sign anything, or submit a transaction. It builds the tx
        blob and returns it to you. Your multisig is responsible for the
        signing flow.
      </section>

      {error && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-6 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="border rounded-lg p-6 bg-white mb-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
            Multisig vault pubkey
          </label>
          <input
            value={multisigVault}
            onChange={(e) => setMultisigVault(e.target.value.trim())}
            placeholder="e.g. Squads vault PDA"
            className="border rounded-lg px-3 py-2 w-full font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            For Squads: the vault PDA (not the multisig PDA).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
              Network
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="devnet">devnet (test)</option>
              <option value="mainnet-beta">mainnet-beta</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
              Amount (SOL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
        </div>

        <button
          onClick={fetchPicks}
          disabled={loadingPicks}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
        >
          {loadingPicks ? "Finding picks…" : "Get recommended validators"}
        </button>
      </div>

      {picks && picks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Pick a validator</h2>
          <div className="space-y-2">
            {picks.map((p) => (
              <button
                key={p.vote_pubkey}
                onClick={() => setChosen(p)}
                className={`w-full text-left border rounded-lg p-3 hover:border-violet-400 ${
                  chosen?.vote_pubkey === p.vote_pubkey
                    ? "border-violet-500 bg-violet-50"
                    : "bg-white"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {p.name ||
                      `${p.vote_pubkey.slice(0, 4)}…${p.vote_pubkey.slice(-4)}`}
                  </span>
                  <span className="text-sm text-slate-600">
                    composite{" "}
                    {p.composite_score
                      ? (p.composite_score * 100).toFixed(1) + "%"
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 italic">
                  {p.reasoning}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        onClick={generateTransaction}
        disabled={!multisigVault || !chosen || working}
        className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 font-medium mb-8"
      >
        {working ? "Generating…" : "Generate transaction"}
      </button>

      {generated && (
        <section className="space-y-6 mb-12">
          <div className="border rounded-lg p-5 bg-emerald-50 border-emerald-200">
            <h3 className="font-bold text-emerald-900 mb-2">
              Transaction generated
            </h3>
            <pre className="text-xs text-emerald-900 whitespace-pre-wrap">
              {generated.summary}
            </pre>
          </div>

          <Block
            label="Base58 (Squads paste-format)"
            value={generated.base58}
          />
          <Block label="Base64" value={generated.base64} />

          <div className="border rounded-lg p-5 bg-slate-50 text-sm space-y-2">
            <p className="font-semibold text-slate-900">Next steps</p>
            <ol className="list-decimal pl-6 text-slate-700 space-y-1">
              <li>
                Open your multisig UI (Squads, Realms, etc.) and start a new
                proposal.
              </li>
              <li>
                Paste the base58 transaction blob into the &ldquo;raw
                transaction&rdquo; / &ldquo;import transaction&rdquo; field.
              </li>
              <li>
                Verify the proposal preview matches the summary above —
                especially the validator vote pubkey and the SOL amount.
              </li>
              <li>
                Submit for approval. Once your council approves and executes,
                the stake account is created and delegated in one shot.
              </li>
              <li>
                Stake account address (save this for tracking):{" "}
                <code className="bg-white px-2 py-0.5 rounded text-xs">
                  {generated.stakeAccountPubkey}
                </code>
              </li>
            </ol>
          </div>
        </section>
      )}

      <section className="text-sm text-slate-500 border-t pt-6 space-y-2">
        <p>
          Generic multisig support — works with any signing flow that accepts
          a serialized Solana transaction. Squads-V4-native UI integration is
          on the post-hackathon roadmap.
        </p>
        <p>
          For non-multisig stakers, use{" "}
          <Link href="/stake" className="text-violet-700 underline">
            /stake
          </Link>{" "}
          (Phantom or Privy single-signer flow).
        </p>
      </section>
    </main>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <textarea
        readOnly
        value={value}
        rows={4}
        className="w-full font-mono text-xs border rounded-lg p-3 bg-slate-900 text-slate-100"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}

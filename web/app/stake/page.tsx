"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Authorized,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  StakeProgram,
  Transaction,
} from "@solana/web3.js";
import { useState } from "react";

import PrivyAltLogin from "@/components/PrivyAltLogin";
import { recommend } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

type RiskProfile = "conservative" | "balanced" | "aggressive";

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function pct(x: number | null) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

export default function StakePage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();

  const [amount, setAmount] = useState("1");
  const [profile, setProfile] = useState<RiskProfile>("balanced");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [stakingFor, setStakingFor] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecs() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }
    setLoadingRecs(true);
    setError(null);
    setRecs(null);
    try {
      const r = await recommend({
        amount_sol: amt,
        risk_profile: profile,
        count: 3,
      });
      setRecs(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch recommendations");
    } finally {
      setLoadingRecs(false);
    }
  }

  async function delegateTo(rec: Recommendation) {
    if (!publicKey || !signTransaction) {
      setError("Connect your wallet first.");
      return;
    }
    setStakingFor(rec.vote_pubkey);
    setError(null);
    setTxSig(null);
    try {
      const lamports = Math.floor(Number(amount) * LAMPORTS_PER_SOL);
      const stakeAccount = Keypair.generate();
      const minRent = await connection.getMinimumBalanceForRentExemption(
        StakeProgram.space
      );
      if (lamports < minRent) {
        throw new Error(
          `Amount too small — minimum is ~${(minRent / LAMPORTS_PER_SOL).toFixed(4)} SOL for stake rent exemption.`
        );
      }

      const createTx = StakeProgram.createAccount({
        fromPubkey: publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(publicKey, publicKey),
        lamports,
      });
      const delegateTx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: publicKey,
        votePubkey: new PublicKey(rec.vote_pubkey),
      });

      const tx = new Transaction();
      tx.add(...createTx.instructions, ...delegateTx.instructions);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.partialSign(stakeAccount);

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stake failed");
    } finally {
      setStakingFor(null);
    }
  }

  const isDevnet =
    !process.env.NEXT_PUBLIC_SOLANA_RPC ||
    process.env.NEXT_PUBLIC_SOLANA_RPC.includes("devnet");

  async function airdropDevnet() {
    if (!publicKey) return;
    setError(null);
    try {
      const sig = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Airdrop failed: ${e.message}. Try the public faucet at faucet.solana.com instead.`
          : "Airdrop failed."
      );
    }
  }

  return (
    <main className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Stake to a top validator</h1>
      <p className="text-slate-600 mb-6">
        Pick a risk profile, get our top-3 ranked picks, and delegate in one
        click.
      </p>

      {isDevnet && (
        <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded mb-6 text-sm">
          <div className="font-semibold text-amber-900 mb-2">
            ⚠ Currently running on Solana devnet
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-amber-900">
            <li>
              Open Phantom → Settings → Developer Settings → Network →{" "}
              <strong>Devnet</strong>
            </li>
            <li>
              Connect below, then click <strong>Airdrop devnet SOL</strong> for
              test funds (or use{" "}
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                faucet.solana.com
              </a>
              )
            </li>
            <li>Pick recs, click Stake — your test SOL gets delegated</li>
          </ol>
        </div>
      )}

      <div className="border rounded-lg p-6 bg-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
              Amount (SOL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
              Risk profile
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as RiskProfile)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchRecs}
              disabled={loadingRecs}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 w-full font-medium disabled:opacity-50"
            >
              {loadingRecs ? "Finding…" : "Get recommendations"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center text-sm">
          {!connected ? (
            <>
              <span className="text-slate-500">
                Connect to enable staking →
              </span>
              <WalletMultiButton
                style={{
                  background: "#0f172a",
                  borderRadius: "8px",
                  fontSize: "14px",
                  height: "36px",
                }}
              />
              <PrivyAltLogin />
            </>
          ) : (
            <>
              <span className="text-emerald-600 font-medium">
                ✓ Wallet connected
              </span>
              <span className="font-mono text-xs text-slate-500">
                {publicKey?.toBase58().slice(0, 4)}…
                {publicKey?.toBase58().slice(-4)}
              </span>
              {isDevnet && (
                <button
                  onClick={airdropDevnet}
                  className="ml-auto px-3 py-1.5 border rounded text-xs hover:bg-slate-50"
                >
                  Airdrop 2 devnet SOL
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {txSig && (
        <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded mb-4 text-sm text-emerald-800">
          <div className="font-semibold mb-1">✓ Stake delegated</div>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=${isDevnet ? "devnet" : "mainnet-beta"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-mono text-xs break-all"
          >
            {txSig.slice(0, 24)}…
          </a>
          <p className="mt-2 text-xs">
            Your stake takes ~1 epoch (~2 days on mainnet, ~30 min on devnet)
            to warm up before earning rewards. Manage it in Phantom under
            Activity → Stake.
          </p>
        </div>
      )}

      {recs && recs.length === 0 && (
        <div className="border rounded-lg p-6 text-center text-slate-500">
          No validators matched your filters. Try a broader risk profile.
        </div>
      )}

      {recs && recs.length > 0 && (
        <div className="space-y-3">
          {recs.map((r) => (
            <div
              key={r.vote_pubkey}
              className="border rounded-lg p-5 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <div className="font-semibold text-lg mb-1">
                  {r.name ?? shortPk(r.vote_pubkey)}
                </div>
                <div className="text-xs font-mono text-slate-500 break-all mb-2">
                  {r.vote_pubkey}
                </div>
                <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
                  <span>
                    Composite:{" "}
                    <strong>{(r.composite_score ?? 0).toFixed(3)}</strong>
                  </span>
                  <span>
                    Downtime: <strong>{pct(r.downtime_prob_7d)}</strong>
                  </span>
                  <span>
                    MEV tax: <strong>{pct(r.mev_tax_rate)}</strong>
                  </span>
                  <span>
                    Decent:{" "}
                    <strong>
                      {(r.decentralization_score ?? 0).toFixed(3)}
                    </strong>
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Why: {r.reasoning}
                </div>
              </div>
              <button
                onClick={() => delegateTo(r)}
                disabled={!connected || stakingFor !== null}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium whitespace-nowrap disabled:opacity-50"
              >
                {stakingFor === r.vote_pubkey
                  ? "Signing…"
                  : `Stake ${amount} SOL`}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

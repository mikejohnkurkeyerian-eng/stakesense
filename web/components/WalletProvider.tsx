"use client";

import {
  ConnectionProvider,
  WalletProvider as SolWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import PrivyOptionalProvider from "@/components/PrivyOptionalProvider";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet");
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <PrivyOptionalProvider>
      <ConnectionProvider endpoint={endpoint}>
        <SolWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolWalletProvider>
      </ConnectionProvider>
    </PrivyOptionalProvider>
  );
}

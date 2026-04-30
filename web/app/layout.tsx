import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import ConnectBar from "@/components/ConnectBar";
import WalletProvider from "@/components/WalletProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "stakesense — predictive validator scoring for Solana",
  description:
    "ML-powered scoring on three pillars: predicted downtime risk, MEV-extracted-from-delegators, and decentralization impact.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <WalletProvider>
          <ConnectBar />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

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

const SITE_URL =
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "stakesense — predictive validator scoring for Solana",
    template: "%s · stakesense",
  },
  description:
    "ML-powered Solana validator scoring on three pillars: predicted downtime risk, MEV tax, and decentralization impact. Open-source, updated every epoch.",
  openGraph: {
    title: "stakesense — predictive validator scoring for Solana",
    description:
      "Open-source ML scoring of every Solana validator. Pick where to stake based on downtime risk, MEV tax, and decentralization impact.",
    url: SITE_URL,
    siteName: "stakesense",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "stakesense — predictive validator scoring for Solana",
    description:
      "Open-source ML scoring of every Solana validator. Pick where to stake.",
  },
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

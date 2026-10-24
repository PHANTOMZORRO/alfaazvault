import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AlfaazVault | Words worth unlocking.",
  description:
    "AlfaazVault is a decentralized literary marketplace where writers publish short written works (stories, articles, poetry, shayari, essays) for Sepolia ETH, and readers pay to unlock and read them.",
  keywords: [
    "AlfaazVault",
    "Web3 Literature",
    "Sepolia ETH",
    "Decentralized Publishing",
    "Shayari",
    "Poetry Marketplace",
    "MetaMask",
  ],
  authors: [{ name: "AlfaazVault" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen flex flex-col bg-vault-bg text-vault-text">
        <WalletProvider>
          <Header />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}

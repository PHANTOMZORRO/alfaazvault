"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Key, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { PurchaseItem } from "@/lib/types";

export default function LibraryPage() {
  const { walletAddress, connectWallet } = useWallet();
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLibrary() {
      if (!walletAddress) {
        setPurchases([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/me/purchases", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
        }
      } catch (err) {
        console.error("Failed to fetch library purchases:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLibrary();
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-vault-soft border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
          <Key className="w-6 h-6 text-vault-primary" />
        </div>
        <h2 className="text-2xl font-bold text-vault-text font-reading">Your AlfaazVault Library</h2>
        <p className="text-sm text-vault-muted max-w-md mx-auto">
          Connect your MetaMask wallet to view all unlocked stories, essays, shayari, and poetry in your personal library.
        </p>
        <div className="pt-2">
          <button
            onClick={() => connectWallet()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-sm font-semibold shadow-sm transition-all"
          >
            <Key className="w-4 h-4 text-sky-200" />
            <span>Connect MetaMask</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="border-b border-vault-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Unlocked Vault</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-vault-text font-reading">
            My Library
          </h1>
          <p className="text-sm text-vault-muted mt-1">
            Works permanently unlocked by your connected wallet on Sepolia.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-soft hover:bg-vault-cardTint border border-vault-border text-vault-primary text-xs font-semibold transition-colors self-start sm:self-center"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Browse More Works</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-vault-border rounded-xl p-6 shadow-vault animate-pulse space-y-3"
            >
              <div className="h-5 w-24 bg-vault-cardTint rounded-full" />
              <div className="h-6 w-1/3 bg-vault-cardTint rounded" />
              <div className="h-4 w-2/3 bg-vault-cardTint rounded" />
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 px-4 bg-vault-soft border border-vault-border rounded-2xl max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-vault-text">Your library is currently empty</h3>
          <p className="text-sm text-vault-muted max-w-sm mx-auto">
            Browse our catalogue of poetry, essays, and stories, and unlock your first piece using Sepolia test ETH.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary text-white text-xs font-semibold hover:bg-vault-primaryHover"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {purchases.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-vault-border rounded-xl p-5 sm:p-6 shadow-vault hover:shadow-vaultHover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border">
                    {item.listing?.category || "Piece"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-vault-success">
                    <ShieldCheck className="w-3.5 h-3.5 text-vault-success" />
                    Unlocked
                  </span>
                </div>

                <Link
                  href={`/listings/${item.listingId}`}
                  className="block text-xl font-bold text-vault-text hover:text-vault-primary transition-colors font-reading"
                >
                  {item.listing?.title || "Untitled Piece"}
                </Link>

                <p className="text-sm text-vault-muted line-clamp-2">
                  {item.listing?.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-vault-muted font-mono pt-1">
                  <span>Purchased on {new Date(item.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Paid: <strong>{item.amountEth} ETH</strong></span>
                  <span>•</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${item.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-vault-primary hover:underline"
                  >
                    <span>Tx: {item.txHash.slice(0, 8)}...{item.txHash.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3 text-vault-accent" />
                  </a>
                </div>
              </div>

              <div className="sm:self-center shrink-0">
                <Link
                  href={`/listings/${item.listingId}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <BookOpen className="w-4 h-4 text-sky-200" />
                  <span>Read Now</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

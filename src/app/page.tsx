"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Sparkles, PlusCircle, BookOpen, Layers, Feather } from "lucide-react";
import { ListingSummary } from "@/lib/types";
import { ListingCard } from "@/components/ListingCard";
import { useWallet } from "@/context/WalletContext";

const CATEGORIES = ["All", "Story", "Article", "Poetry", "Shayari", "Essay", "Other"];

export default function HomePage() {
  const { walletAddress } = useWallet();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedCategory && selectedCategory !== "All") {
        params.append("category", selectedCategory);
      }

      const res = await fetch(`/api/listings?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error("Failed to load listings:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 150);

    const onFocus = () => fetchListings();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchListings, walletAddress]);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-vault-soft border-b border-vault-border py-14 sm:py-20">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden opacity-40">
          <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute top-10 right-1/4 w-80 h-80 rounded-full bg-sky-100/60 blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-vault-border text-xs font-semibold text-vault-primary shadow-xs">
            <Feather className="w-3.5 h-3.5 text-vault-accent" />
            <span>Decentralized Words on Sepolia Testnet</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-vault-text font-reading">
            Words worth <span className="text-vault-primary underline decoration-vault-accent/40 decoration-wavy">unlocking</span>.
          </h1>

          <p className="text-base sm:text-lg text-vault-muted max-w-2xl mx-auto leading-relaxed">
            AlfaazVault is an open literary marketplace. Writers publish poetry, stories, shayari, and essays for ETH—readers unlock the full text directly through on-chain smart contracts.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/write"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-sky-200" />
              <span>Publish Your Work</span>
            </Link>
            <a
              href="#browse-section"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-vault-cardTint border border-vault-primary text-vault-primary text-sm font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore Vault</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Browse Section */}
      <section id="browse-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Search and Filters */}
        <div className="space-y-6 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or description..."
                id="search-input"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-vault-border bg-white text-sm text-vault-text placeholder-vault-muted/70 focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs"
              />
            </div>

            <div className="text-xs text-vault-muted font-mono flex items-center gap-1.5 self-end sm:self-center">
              <Layers className="w-3.5 h-3.5 text-vault-accent" />
              <span>{listings.length} {listings.length === 1 ? "piece" : "pieces"} available</span>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-vault-primary text-white shadow-xs"
                      : "bg-white text-vault-muted hover:text-vault-text border border-vault-border hover:bg-vault-cardTint"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-vault-border rounded-xl p-5 shadow-vault animate-pulse space-y-4"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-20 bg-vault-cardTint rounded-full" />
                  <div className="h-5 w-16 bg-vault-cardTint rounded" />
                </div>
                <div className="h-6 w-3/4 bg-vault-cardTint rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-vault-cardTint/70 rounded" />
                  <div className="h-4 w-5/6 bg-vault-cardTint/70 rounded" />
                </div>
                <div className="pt-4 border-t border-vault-border flex justify-between items-center">
                  <div className="h-5 w-24 bg-vault-cardTint rounded" />
                  <div className="h-8 w-24 bg-vault-cardTint rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-vault-soft border border-vault-border rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-vault-text">No pieces yet. Be the first to publish.</h3>
            <p className="text-sm text-vault-muted max-w-sm mx-auto">
              Share your poetry, stories, essays, or shayari with readers on the Sepolia network.
            </p>
            <div className="pt-2">
              <Link
                href="/write"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary text-white text-xs font-semibold hover:bg-vault-primaryHover"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Write New Piece</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Feather,
  PlusCircle,
  Eye,
  EyeOff,
  Coins,
  TrendingUp,
  BookOpen,
  Edit3,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Key,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { WriterListingItem } from "@/lib/types";
import { parseEthToWei } from "@/lib/blockchain";

export default function MyListingsPage() {
  const {
    walletAddress,
    connectWallet,
    updateListingOnChain,
    isCorrectNetwork,
    switchToSepolia,
  } = useWallet();

  const [listings, setListings] = useState<WriterListingItem[]>([]);
  const [summary, setSummary] = useState({
    totalListings: 0,
    totalSales: 0,
    totalEarnedEth: "0",
  });
  const [loading, setLoading] = useState(true);

  // Price update modal state
  const [editingItem, setEditingItem] = useState<WriterListingItem | null>(null);
  const [newPriceEth, setNewPriceEth] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchWriterListings = useCallback(async () => {
    if (!walletAddress) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me/listings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
        if (data.summary) {
          setSummary({
            totalListings: data.summary.totalListings,
            totalSales: data.summary.totalSales,
            totalEarnedEth: data.summary.totalEarnedEth,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load writer listings:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchWriterListings();
  }, [fetchWriterListings]);

  // Handle active status toggle
  const handleToggleActive = async (item: WriterListingItem) => {
    if (!isCorrectNetwork) {
      const switched = await switchToSepolia();
      if (!switched) return;
    }

    try {
      setUpdating(true);
      // Step 1: Call updateListing on-chain if real listing
      if (item.chainListingId >= 0) {
        await updateListingOnChain(item.chainListingId, item.priceWei, !item.active);
      }

      // Step 2: Update database
      const res = await fetch(`/api/listings/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (!res.ok) throw new Error("Failed to update status in database");

      await fetchWriterListings();
    } catch (err: any) {
      alert(`Error toggling listing status: ${err?.message || "Transaction failed"}`);
    } finally {
      setUpdating(false);
    }
  };

  // Handle Price Update
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setUpdateError(null);

    let newPriceWei: string;
    try {
      newPriceWei = parseEthToWei(newPriceEth);
      if (BigInt(newPriceWei) <= 0) {
        setUpdateError("Price must be greater than 0");
        return;
      }
    } catch {
      setUpdateError("Invalid ETH price entered");
      return;
    }

    if (!isCorrectNetwork) {
      const switched = await switchToSepolia();
      if (!switched) return;
    }

    setUpdating(true);
    try {
      // Step 1: Update on-chain
      if (editingItem.chainListingId >= 0) {
        await updateListingOnChain(editingItem.chainListingId, newPriceWei, editingItem.active);
      }

      // Step 2: Update in database
      const res = await fetch(`/api/listings/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceEth: newPriceEth }),
      });

      if (!res.ok) throw new Error("Failed to update price in database");

      setEditingItem(null);
      await fetchWriterListings();
    } catch (err: any) {
      setUpdateError(err?.message || "Failed to update price on-chain.");
    } finally {
      setUpdating(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-vault-soft border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
          <Key className="w-6 h-6 text-vault-primary" />
        </div>
        <h2 className="text-2xl font-bold text-vault-text font-reading">Writer Dashboard</h2>
        <p className="text-sm text-vault-muted max-w-md mx-auto">
          Connect your author wallet to view earnings, sales, and manage your published works on AlfaazVault.
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="border-b border-vault-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border mb-2">
            <Feather className="w-3.5 h-3.5" />
            <span>Writer Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-vault-text font-reading">
            My Published Works
          </h1>
          <p className="text-sm text-vault-muted mt-1">
            Track sales and manage on-chain listings directly from your connected wallet.
          </p>
        </div>

        <Link
          href="/write"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4 text-sky-200" />
          <span>Publish New Work</span>
        </Link>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-vault-border rounded-xl p-5 shadow-vault">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-vault-muted">
              Published Pieces
            </span>
            <BookOpen className="w-4 h-4 text-vault-accent" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-vault-text">
            {summary.totalListings}
          </div>
        </div>

        <div className="bg-white border border-vault-border rounded-xl p-5 shadow-vault">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-vault-muted">
              Total Readers (Sales)
            </span>
            <TrendingUp className="w-4 h-4 text-vault-success" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-vault-text">
            {summary.totalSales}
          </div>
        </div>

        <div className="bg-white border border-vault-border rounded-xl p-5 shadow-vault">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-vault-muted">
              Total Revenue Earned
            </span>
            <Coins className="w-4 h-4 text-vault-primary" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-vault-primary">
            {summary.totalEarnedEth} <span className="text-sm font-sans font-semibold">ETH</span>
          </div>
        </div>
      </div>

      {/* Listings Table / Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-vault-border rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-vault-soft border border-vault-border rounded-2xl max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
            <Feather className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-vault-text">No pieces listed under this wallet</h3>
          <p className="text-sm text-vault-muted max-w-sm mx-auto">
            You haven&apos;t published any literary works yet. Share your story or poetry on AlfaazVault!
          </p>
          <div className="pt-2">
            <Link
              href="/write"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary text-white text-xs font-semibold hover:bg-vault-primaryHover"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish First Piece</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-vault-border rounded-xl shadow-vault overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-vault-soft border-b border-vault-border text-xs uppercase font-semibold text-vault-muted">
                  <th className="py-3 px-4">Title & Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Sales</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border/60">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-vault-cardTint/30 transition-colors">
                    <td className="py-4 px-4 max-w-xs">
                      <Link
                        href={`/listings/${item.id}`}
                        className="font-bold text-vault-text hover:text-vault-primary transition-colors block truncate"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-vault-soft border border-vault-border text-vault-muted">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-vault-muted font-mono">
                          ID: #{item.chainListingId}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-semibold text-vault-text whitespace-nowrap">
                      {item.priceEth} ETH
                    </td>

                    <td className="py-4 px-4 font-mono text-vault-text whitespace-nowrap">
                      {item.totalSales} {item.totalSales === 1 ? "reader" : "readers"}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-vault-primary whitespace-nowrap">
                      {item.totalEarnedEth} ETH
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.active
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {item.active ? "Active" : "Hidden"}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Change Price */}
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setNewPriceEth(item.priceEth);
                            setUpdateError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-vault-primary hover:bg-vault-cardTint rounded-lg border border-vault-border transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Price</span>
                        </button>

                        {/* Hide / Show */}
                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={updating}
                          className="px-2.5 py-1 text-xs font-semibold text-vault-muted hover:text-vault-text hover:bg-vault-soft rounded-lg border border-vault-border transition-colors flex items-center gap-1"
                        >
                          {item.active ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Show</span>
                            </>
                          )}
                        </button>

                        {/* View */}
                        <Link
                          href={`/listings/${item.id}`}
                          className="p-1.5 text-vault-muted hover:text-vault-primary transition-colors"
                          title="View Piece"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Price Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-vault-border rounded-2xl max-w-md w-full p-6 shadow-vaultHover space-y-4">
            <h3 className="text-lg font-bold text-vault-text font-reading">
              Update Listing Price
            </h3>
            <p className="text-xs text-vault-muted">
              Piece: <strong>{editingItem.title}</strong>
            </p>

            {updateError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-vault-error rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-vault-text uppercase tracking-wider">
                  New Price in Sepolia ETH
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={newPriceEth}
                    onChange={(e) => setNewPriceEth(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-vault-border text-sm font-mono focus:outline-none focus:border-vault-accent"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-vault-primary">
                    ETH
                  </span>
                </div>
                <p className="text-[11px] text-vault-muted">
                  Requires confirming <code>updateListing</code> on Sepolia in MetaMask.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={updating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-vault-muted hover:bg-vault-soft border border-vault-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-xs font-semibold"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <span>Save New Price</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

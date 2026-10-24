"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { History, ExternalLink, Key, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { TransactionRecord } from "@/lib/types";
import { formatAddress } from "@/lib/blockchain";

export default function HistoryPage() {
  const { walletAddress, connectWallet } = useWallet();
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!walletAddress) {
        setHistory([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/me/history");
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load transaction history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-vault-soft border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
          <Key className="w-6 h-6 text-vault-primary" />
        </div>
        <h2 className="text-2xl font-bold text-vault-text font-reading">Transaction History</h2>
        <p className="text-sm text-vault-muted max-w-md mx-auto">
          Connect your MetaMask wallet to view your purchase and earnings ledger on Sepolia Testnet.
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
            <History className="w-3.5 h-3.5" />
            <span>On-chain Ledger</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-vault-text font-reading">
            Transaction History
          </h1>
          <p className="text-sm text-vault-muted mt-1">
            Complete record of purchases made and reader sales received by your wallet on Sepolia.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-vault-muted">
          <ShieldCheck className="w-4 h-4 text-vault-success" />
          <span>Verified via Sepolia Etherscan</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-vault-border rounded-xl p-5 animate-pulse h-16" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 px-4 bg-vault-soft border border-vault-border rounded-2xl max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-vault-text">No transactions recorded yet</h3>
          <p className="text-sm text-vault-muted max-w-sm mx-auto">
            Once you buy a piece or readers unlock your writing, every on-chain transaction hash will appear here.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary text-white text-xs font-semibold hover:bg-vault-primaryHover"
            >
              <span>Browse Vault</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-vault-border rounded-xl shadow-vault overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-vault-soft border-b border-vault-border text-xs uppercase font-semibold text-vault-muted">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Piece Title</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Counterparty</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Etherscan Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border/60">
                {history.map((record) => {
                  const isBuyer = record.role === "buyer";
                  return (
                    <tr key={record.id} className="hover:bg-vault-cardTint/30 transition-colors">
                      {/* Type Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isBuyer
                              ? "bg-sky-50 text-sky-800 border border-sky-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isBuyer ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-sky-600" />
                              <span>Unlocked (Paid)</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reader Sale (Earned)</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="py-4 px-4 max-w-xs">
                        <Link
                          href={`/listings/${record.listingId}`}
                          className="font-bold text-vault-text hover:text-vault-primary transition-colors block truncate"
                        >
                          {record.listingTitle}
                        </Link>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-mono font-bold text-vault-text whitespace-nowrap">
                        <span className={isBuyer ? "text-vault-text" : "text-vault-success"}>
                          {isBuyer ? "-" : "+"}
                          {record.amountEth} ETH
                        </span>
                      </td>

                      {/* Counterparty */}
                      <td className="py-4 px-4 font-mono text-xs text-vault-muted whitespace-nowrap">
                        {isBuyer ? "Author: " : "Buyer: "}
                        <span className="text-vault-text font-medium">
                          {formatAddress(record.otherWallet)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-vault-muted whitespace-nowrap">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>

                      {/* Etherscan Link */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-vault-primary hover:bg-vault-cardTint border border-vault-border transition-colors"
                        >
                          <span>{record.txHash.slice(0, 6)}...{record.txHash.slice(-4)}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-vault-accent" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

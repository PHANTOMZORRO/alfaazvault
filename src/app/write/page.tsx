"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Feather,
  Key,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  HelpCircle,
  Eye,
  PenTool,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { parseEthToWei } from "@/lib/blockchain";
import { CONTRACT_ADDRESS } from "@/contracts/contractConfig";

const CATEGORIES = ["Story", "Article", "Poetry", "Shayari", "Essay", "Other"];

export default function WritePage() {
  const router = useRouter();
  const {
    walletAddress,
    isAuthenticated,
    isCorrectNetwork,
    connectWallet,
    authenticateSession,
    switchToSepolia,
    createListingOnChain,
  } = useWallet();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Poetry");
  const [description, setDescription] = useState("");
  const [priceEth, setPriceEth] = useState("0.005");
  const [fullText, setFullText] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Script detection
  const isUrdu = /[\u0600-\u06FF]/.test(title + fullText);
  const isHindi = /[\u0900-\u097F]/.test(title + fullText);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!walletAddress) {
      setErrorMsg("Please connect your MetaMask wallet first.");
      return;
    }

    if (!isCorrectNetwork) {
      const switched = await switchToSepolia();
      if (!switched) {
        setErrorMsg("You must be on Sepolia Testnet to publish on AlfaazVault.");
        return;
      }
    }

    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }

    if (!description.trim() || description.length > 300) {
      setErrorMsg("Description must be between 1 and 300 characters.");
      return;
    }

    if (!fullText.trim()) {
      setErrorMsg("Full text of the piece cannot be empty.");
      return;
    }

    let priceWei: string;
    try {
      priceWei = parseEthToWei(priceEth);
      if (BigInt(priceWei) <= 0) {
        setErrorMsg("Price in ETH must be greater than 0.");
        return;
      }
    } catch {
      setErrorMsg("Invalid ETH price entered.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Ensure authenticated session with backend
      if (!isAuthenticated) {
        setSubmitStep("Requesting signature in MetaMask to verify wallet session...");
        const authed = await authenticateSession(walletAddress);
        if (!authed) {
          throw new Error("Wallet signature required to authorize listing creation.");
        }
      }

      // Step 2: Contract check
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error(
          "Smart contract address is not configured yet. Please deploy the contract in Remix on Sepolia and set NEXT_PUBLIC_CONTRACT_ADDRESS in .env."
        );
      }

      // Step 3: Call createListing on smart contract
      setSubmitStep("Confirm the createListing transaction in MetaMask...");
      const { chainListingId, txHash } = await createListingOnChain(priceWei, fullText);

      // Step 4: Save listing details to backend
      setSubmitStep("Verifying content hash and saving listing in AlfaazVault database...");
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priceEth,
          fullText: fullText.trim(),
          chainListingId,
          createdTxHash: txHash,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save listing to database.");
      }

      const data = await res.json();
      router.push(`/listings/${data.id}`);
    } catch (err: any) {
      console.error("Listing creation failed:", err);
      setErrorMsg(err?.message || "Failed to publish listing.");
    } finally {
      setSubmitting(false);
      setSubmitStep("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Page Header */}
      <div className="border-b border-vault-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border mb-2">
            <Feather className="w-3.5 h-3.5" />
            <span>Writer Studio</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-vault-text font-reading">
            Publish on AlfaazVault
          </h1>
          <p className="text-sm text-vault-muted mt-1">
            List your original stories, poetry, shayari, articles, or essays. Only paying readers will unlock the full text.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vault-border text-xs font-semibold text-vault-muted hover:text-vault-text hover:bg-vault-soft transition-colors"
          >
            {isPreview ? <PenTool className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreview ? "Edit Mode" : "Preview Reader View"}</span>
          </button>
        </div>
      </div>

      {/* Wallet Connection Gate */}
      {!walletAddress ? (
        <div className="bg-vault-soft border border-vault-border rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary shadow-xs">
            <Key className="w-6 h-6 text-vault-primary" />
          </div>
          <h3 className="text-lg font-bold text-vault-text">Connect Your Wallet to Publish</h3>
          <p className="text-sm text-vault-muted leading-relaxed">
            MetaMask is required to sign the listing transaction and receive payments in ETH directly to your wallet address.
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
      ) : isPreview ? (
        /* Live Preview Mode */
        <div className="bg-white rounded-2xl border border-vault-border p-6 sm:p-12 shadow-sm space-y-6">
          <div className="border-b border-vault-border pb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border">
              {category}
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-bold text-vault-text mt-3 ${
                isUrdu ? "font-urdu" : isHindi ? "font-devanagari" : "font-reading"
              }`}
            >
              {title || "Untitled Piece"}
            </h2>
            <p className="text-sm text-vault-muted mt-2">
              {description || "No description provided."}
            </p>
            <div className="mt-3 text-xs font-mono text-vault-muted">
              Price: <strong>{priceEth} ETH</strong> • Author: {walletAddress}
            </div>
          </div>

          <article
            className={`max-w-2xl mx-auto text-vault-text text-lg whitespace-pre-wrap leading-loose ${
              isUrdu ? "font-urdu text-xl" : isHindi ? "font-devanagari" : "font-reading"
            }`}
          >
            {fullText || "Start typing your full piece in the editor to see the reader preview here."}
          </article>
        </div>
      ) : (
        /* Publishing Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-vault-error flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to publish</p>
                <p className="text-xs mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {submitting && (
            <div className="p-4 rounded-xl bg-vault-soft border border-vault-accent text-sm text-vault-primary flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-vault-primary shrink-0" />
              <div>
                <p className="font-semibold">Publishing your piece...</p>
                <p className="text-xs text-vault-muted mt-0.5">{submitStep}</p>
              </div>
            </div>
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="title-input" className="block text-xs font-semibold uppercase tracking-wider text-vault-text">
                Title <span className="text-vault-error">*</span>
              </label>
              <input
                id="title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Architecture of Solitude / دیارِ عشق / अग्निपथ"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-vault-border bg-white text-sm text-vault-text focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category-select" className="block text-xs font-semibold uppercase tracking-wider text-vault-text">
                Category <span className="text-vault-error">*</span>
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-vault-border bg-white text-sm text-vault-text focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="desc-input" className="block text-xs font-semibold uppercase tracking-wider text-vault-text">
                  Short Description (Teaser) <span className="text-vault-error">*</span>
                </label>
                <span
                  className={`text-[11px] ${
                    description.length > 280 ? "text-vault-error font-semibold" : "text-vault-muted"
                  }`}
                >
                  {description.length}/300
                </span>
              </div>
              <textarea
                id="desc-input"
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A compelling synopsis or introductory note visible to everyone browsing AlfaazVault..."
                required
                className="w-full px-4 py-2.5 rounded-xl border border-vault-border bg-white text-sm text-vault-text focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="price-input" className="block text-xs font-semibold uppercase tracking-wider text-vault-text">
                Price in ETH <span className="text-vault-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="price-input"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={priceEth}
                  onChange={(e) => setPriceEth(e.target.value)}
                  placeholder="0.01"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-vault-border bg-white text-sm font-mono text-vault-text focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-vault-primary">
                  ETH
                </span>
              </div>
              <p className="text-[11px] text-vault-muted leading-tight">
                Sepolia test ETH. You receive 100% of the sale directly to your wallet.
              </p>
            </div>
          </div>

          {/* Full Text (Protected) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="content-textarea" className="block text-xs font-semibold uppercase tracking-wider text-vault-text">
                Full Text Content <span className="text-vault-error">*</span>
              </label>
              <div className="flex items-center gap-2 text-[11px] text-vault-muted">
                {isUrdu && <span className="text-vault-primary font-semibold">Urdu Script Detected (RTL)</span>}
                {isHindi && <span className="text-vault-primary font-semibold">Hindi Devanagari Detected</span>}
                <span>Locked until purchased</span>
              </div>
            </div>
            <textarea
              id="content-textarea"
              rows={14}
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              placeholder="Paste your poem, story, shayari, or essay here. Line breaks and indentation are preserved exactly as written..."
              required
              className={`w-full p-4 rounded-xl border border-vault-border bg-white text-base text-vault-text focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all shadow-xs leading-relaxed ${
                isUrdu ? "font-urdu text-lg" : isHindi ? "font-devanagari text-base" : "font-reading"
              }`}
              style={{ direction: isUrdu ? "rtl" : "ltr" }}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex items-center justify-between border-t border-vault-border">
            <div className="text-xs text-vault-muted">
              By listing, keccak256 hash will be recorded on Sepolia.
            </div>

            <button
              type="submit"
              disabled={submitting}
              id="btn-publish-listing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-sky-200" />
                  <span>Publish Piece ({priceEth} ETH)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

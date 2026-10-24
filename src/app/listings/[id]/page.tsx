"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  User,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { ListingDetail, ListingContentResponse } from "@/lib/types";
import { useWallet, BuyStatus } from "@/context/WalletContext";
import { formatAddress } from "@/lib/blockchain";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params?.id as string;

  const {
    walletAddress,
    isAuthenticated,
    isCorrectNetwork,
    connectWallet,
    buyListing,
    switchToSepolia,
  } = useWallet();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [content, setContent] = useState<ListingContentResponse | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Buy flow state
  const [buying, setBuying] = useState(false);
  const [buyStatus, setBuyStatus] = useState<BuyStatus>("idle");
  const [buyStatusMessage, setBuyStatusMessage] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);

  // Fetch public listing info
  const loadListing = useCallback(async () => {
    if (!listingId) return;
    setLoadingListing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setListing(data.listing);
        setHasAccess(Boolean(data.listing?.hasAccess));
      } else {
        setListing(null);
      }
    } catch (err) {
      console.error("Failed to load listing:", err);
    } finally {
      setLoadingListing(false);
    }
  }, [listingId]);

  // Fetch protected full content once access is confirmed
  const loadContent = useCallback(async () => {
    if (!listingId) return;
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/content`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setContent(data);
        setHasAccess(true);
      } else {
        setContent(null);
      }
    } catch (err) {
      console.error("Failed to fetch full content:", err);
    } finally {
      setLoadingContent(false);
    }
  }, [listingId]);

  useEffect(() => {
    loadListing();
  }, [loadListing, walletAddress]);

  useEffect(() => {
    if (hasAccess || listing?.isDemo) {
      loadContent();
    }
  }, [hasAccess, listing?.isDemo, loadContent]);

  // Handle Buy action
  const handleBuy = async () => {
    if (!listing) return;
    setBuyError(null);
    setBuying(true);

    const result = await buyListing(
      listing.chainListingId,
      listing.id,
      listing.priceWei,
      (status, message) => {
        setBuyStatus(status);
        if (message) setBuyStatusMessage(message);
      }
    );

    if (result.success) {
      setHasAccess(true);
      await loadContent();
      await loadListing();
    } else {
      setBuyError(result.error || "Purchase could not be completed.");
    }
    setBuying(false);
  };

  if (loadingListing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="h-6 w-32 bg-vault-cardTint rounded animate-pulse" />
        <div className="h-10 w-2/3 bg-vault-cardTint rounded animate-pulse" />
        <div className="h-28 w-full bg-vault-cardTint rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-vault-error mx-auto" />
        <h2 className="text-xl font-bold text-vault-text">Piece Not Found</h2>
        <p className="text-sm text-vault-muted">
          The requested work does not exist or may have been unlisted.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Browse</span>
        </Link>
      </div>
    );
  }

  // Detect script language
  const isUrdu = /[\u0600-\u06FF]/.test(listing.title + (content?.fullText || ""));
  const isHindi = /[\u0900-\u097F]/.test(listing.title + (content?.fullText || ""));

  return (
    <div className="w-full pb-20">
      {/* Header bar / Breadcrumbs */}
      <div className="bg-vault-soft border-b border-vault-border py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-vault-primary hover:underline underline-offset-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-vault-primary border border-vault-border">
              {listing.category}
            </span>
            {listing.isDemo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                <Sparkles className="w-3 h-3 text-vault-accent" />
                Demo Sample
              </span>
            )}
            {listing.isAuthor && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Author
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        {/* Title & Metadata */}
        <div className="border-b border-vault-border pb-8 space-y-4">
          <h1
            className={`text-2xl sm:text-4xl font-extrabold text-vault-text tracking-tight ${
              isUrdu ? "font-urdu text-3xl sm:text-4xl" : isHindi ? "font-devanagari text-2xl sm:text-3xl" : "font-reading"
            }`}
          >
            {listing.title}
          </h1>

          <p className="text-base text-vault-muted leading-relaxed">
            {listing.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-vault-muted font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-vault-accent" />
                <span>Author: {formatAddress(listing.authorWallet)}</span>
              </span>
              <span>•</span>
              <span>Price: <strong className="text-vault-text">{listing.priceEth} ETH</strong></span>
            </div>

            {listing.createdTxHash && listing.createdTxHash.startsWith("0x") && (
              <a
                href={`https://sepolia.etherscan.io/tx/${listing.createdTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-vault-primary hover:underline"
              >
                <span>Proof on Sepolia</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Content Section: Either Unlocked Reading View OR Locked Box */}
        <div className="mt-8">
          {hasAccess && content ? (
            /* Unlocked Reading View:
               - Pure white page
               - text colour #0C2A3F
               - narrow centred column (about 65 characters per line: max-w-prose / max-w-2xl)
               - generous line height
               - preserved line breaks
            */
            <div className="bg-white rounded-2xl border border-vault-border p-6 sm:p-12 shadow-sm">
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-vault-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-vault-success">
                  <ShieldCheck className="w-4 h-4 text-vault-success" />
                  <span>On-chain Access Verified & Unlocked</span>
                </div>
                <div className="text-[11px] font-mono text-vault-muted">
                  SHA-256 / Keccak: {listing.contentHash.slice(0, 10)}...
                </div>
              </div>

              {/* Reader Viewport */}
              <article
                className={`max-w-2xl mx-auto text-vault-text text-lg sm:text-xl whitespace-pre-wrap leading-loose ${
                  isUrdu
                    ? "font-urdu text-xl sm:text-2xl"
                    : isHindi
                    ? "font-devanagari"
                    : "font-reading"
                }`}
                style={{ lineHeight: isUrdu ? "2.4" : "2.0" }}
              >
                {content.fullText}
              </article>

              <div className="mt-12 pt-6 border-t border-vault-border/60 text-center text-xs text-vault-muted">
                End of piece • Published via AlfaazVault on Sepolia Testnet
              </div>
            </div>
          ) : (
            /* Locked Content Box:
               - #F0F9FF background
               - Lock icon
               - "Buy for X ETH to unlock"
            */
            <div className="bg-vault-soft border-2 border-dashed border-vault-border rounded-2xl p-8 sm:p-14 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-white border border-vault-border flex items-center justify-center mx-auto text-vault-primary shadow-xs">
                <Lock className="w-8 h-8 text-vault-primary" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-vault-text">
                  This work is locked
                </h3>
                <p className="text-sm text-vault-muted leading-relaxed">
                  Support the author and unlock the full text permanently for your wallet via the Sepolia smart contract.
                </p>
              </div>

              {/* Status or Progress Feedback during Purchase */}
              {buying && (
                <div className="max-w-md mx-auto p-4 rounded-xl bg-white border border-vault-accent shadow-xs space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-vault-primary">
                    <Loader2 className="w-4 h-4 animate-spin text-vault-primary" />
                    <span>{buyStatusMessage || "Processing transaction..."}</span>
                  </div>
                  <div className="text-xs text-vault-muted">
                    {buyStatus === "metamask_prompt" && "Please review and confirm the payment in your MetaMask window."}
                    {buyStatus === "waiting_tx" && "Transaction sent to Sepolia testnet. Waiting for block confirmation..."}
                    {buyStatus === "verifying_backend" && "Smart contract confirmed. Verifying event receipt with AlfaazVault..."}
                  </div>
                </div>
              )}

              {buyError && (
                <div className="max-w-md mx-auto p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-vault-error flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{buyError}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                {!walletAddress ? (
                  <button
                    onClick={() => connectWallet()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Key className="w-4 h-4 text-sky-200" />
                    <span>Connect MetaMask to Buy</span>
                  </button>
                ) : !isCorrectNetwork ? (
                  <button
                    onClick={() => switchToSepolia()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-all"
                  >
                    <span>Switch to Sepolia Network</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-vault-primary hover:bg-vault-primaryHover text-white text-base font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Unlock className="w-5 h-5 text-sky-200" />
                    <span>{buying ? "Processing..." : `Buy for ${listing.priceEth} ETH to unlock`}</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-vault-muted font-mono">
                Contract: {listing.chainListingId >= 0 ? `Listing #${listing.chainListingId}` : "Demo Piece"} • One-time Sepolia ETH payment
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

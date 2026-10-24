"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Sparkles, User, ArrowRight } from "lucide-react";
import { ListingSummary } from "@/lib/types";
import { formatAddress } from "@/lib/blockchain";
import { useWallet } from "@/context/WalletContext";

interface ListingCardProps {
  listing: ListingSummary;
  onQuickBuy?: (listing: ListingSummary) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onQuickBuy }) => {
  const { walletAddress, purchasedListingIds } = useWallet();
  const isAuthor = Boolean(
    walletAddress && listing.authorWallet.toLowerCase() === walletAddress.toLowerCase()
  );
  const isPurchased = Boolean(
    listing.isPurchased || (purchasedListingIds && purchasedListingIds.has(listing.id))
  );
  const isUrdu = /[\u0600-\u06FF]/.test(listing.title);
  const isHindi = /[\u0900-\u097F]/.test(listing.title);

  return (
    <div className="group relative bg-white border border-vault-border rounded-xl p-5 shadow-vault hover:shadow-vaultHover hover:border-vault-accent transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-soft text-vault-primary border border-vault-border">
            {listing.category}
          </span>

          <div className="flex items-center gap-1.5">
            {listing.isDemo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Sparkles className="w-3 h-3 text-vault-accent" />
                Demo Piece
              </span>
            )}
            {isAuthor && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Your Work
              </span>
            )}
            {isPurchased && !isAuthor && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Purchased
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <Link href={`/listings/${listing.id}`} className="block group-hover:text-vault-primary transition-colors">
          <h3
            className={`text-lg font-bold text-vault-text line-clamp-2 leading-snug ${
              isUrdu ? "font-urdu text-xl" : isHindi ? "font-devanagari text-lg" : "font-reading"
            }`}
          >
            {listing.title}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="mt-2 text-sm text-vault-muted line-clamp-3 leading-relaxed">
          {listing.description}
        </p>
      </div>

      {/* Card Footer: Author, Price, Action */}
      <div className="mt-5 pt-4 border-t border-vault-border/60">
        <div className="flex items-center justify-between text-xs text-vault-muted mb-3">
          <div className="flex items-center gap-1 font-mono">
            <User className="w-3.5 h-3.5 text-vault-accent" />
            <span>{formatAddress(listing.authorWallet)}</span>
          </div>
          {listing.purchaseCount !== undefined && listing.purchaseCount > 0 && (
            <span className="text-[11px] text-vault-muted">
              {listing.purchaseCount} {listing.purchaseCount === 1 ? "reader" : "readers"}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-vault-muted">
              Price
            </span>
            <span className="text-base font-bold text-vault-text font-mono">
              {listing.priceEth} <span className="text-xs font-semibold text-vault-primary">ETH</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPurchased || isAuthor || listing.isDemo ? (
              <Link
                href={`/listings/${listing.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-vault-soft hover:bg-vault-cardTint border border-vault-border text-vault-primary text-xs font-semibold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read</span>
              </Link>
            ) : (
              <Link
                href={`/listings/${listing.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-vault-primary hover:bg-vault-primaryHover text-white text-xs font-medium shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Buy for {listing.priceEth} ETH</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

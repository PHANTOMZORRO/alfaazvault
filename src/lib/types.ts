export type Category = "Story" | "Article" | "Poetry" | "Shayari" | "Essay" | "Other";

export interface ListingSummary {
  id: string;
  chainListingId: number;
  authorWallet: string;
  title: string;
  description: string;
  category: string;
  priceWei: string;
  priceEth: string;
  contentHash: string;
  active: boolean;
  isDemo: boolean;
  createdAt: string;
  isPurchased?: boolean;
  isAuthor?: boolean;
  purchaseCount?: number;
}

export interface ListingDetail extends ListingSummary {
  createdTxHash: string;
  hasAccess?: boolean;
}

export interface ListingContentResponse {
  id: string;
  title: string;
  fullText: string;
  authorWallet: string;
  category: string;
  hasAccess: boolean;
}

export interface PurchaseItem {
  id: string;
  listingId: string;
  listing: {
    id: string;
    title: string;
    category: string;
    description: string;
    authorWallet: string;
    chainListingId: number;
  };
  buyerWallet: string;
  txHash: string;
  amountWei: string;
  amountEth: string;
  blockTimestamp: number;
  createdAt: string;
}

export interface WriterListingItem extends ListingSummary {
  totalSales: number;
  totalEarnedWei: string;
  totalEarnedEth: string;
}

export interface TransactionRecord {
  id: string;
  listingTitle: string;
  listingId: string;
  chainListingId: number;
  role: "buyer" | "author";
  otherWallet: string;
  amountWei: string;
  amountEth: string;
  txHash: string;
  timestamp: number;
  createdAt: string;
}

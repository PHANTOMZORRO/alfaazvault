import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWallet } from "@/lib/auth";
import { formatEth } from "@/lib/blockchain";

export async function GET() {
  try {
    const sessionWallet = await getSessionWallet();
    if (!sessionWallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedAddress = sessionWallet.toLowerCase();

    // Purchases where the user was the buyer
    const buyerPurchases = await prisma.purchase.findMany({
      where: { buyerWallet: normalizedAddress },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            chainListingId: true,
            authorWallet: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Purchases of listings created by the user (where user was author)
    const authorSales = await prisma.purchase.findMany({
      where: {
        listing: {
          authorWallet: normalizedAddress,
        },
        NOT: {
          buyerWallet: normalizedAddress, // Avoid duplicate if author bought own piece (if allowed)
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            chainListingId: true,
            authorWallet: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const records = [
      ...buyerPurchases.map((p) => ({
        id: p.id,
        listingId: p.listingId,
        listingTitle: p.listing?.title || "Unknown Piece",
        chainListingId: p.listing?.chainListingId ?? 0,
        role: "buyer" as const,
        otherWallet: p.listing?.authorWallet || "",
        amountWei: p.amountWei,
        amountEth: formatEth(p.amountWei),
        txHash: p.txHash,
        timestamp: Number(p.blockTimestamp),
        createdAt: p.createdAt.toISOString(),
      })),
      ...authorSales.map((s) => ({
        id: s.id,
        listingId: s.listingId,
        listingTitle: s.listing?.title || "Unknown Piece",
        chainListingId: s.listing?.chainListingId ?? 0,
        role: "author" as const,
        otherWallet: s.buyerWallet,
        amountWei: s.amountWei,
        amountEth: formatEth(s.amountWei),
        txHash: s.txHash,
        timestamp: Number(s.blockTimestamp),
        createdAt: s.createdAt.toISOString(),
      })),
    ];

    // Sort all records by createdAt descending
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ history: records });
  } catch (error: any) {
    console.error("Error in GET /api/me/history:", error);
    return NextResponse.json({ error: "Failed to fetch transaction history" }, { status: 500 });
  }
}

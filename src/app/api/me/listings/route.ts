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

    const listings = await prisma.listing.findMany({
      where: { authorWallet: sessionWallet.toLowerCase() },
      include: {
        purchases: {
          select: {
            id: true,
            amountWei: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let overallEarnedWei = BigInt(0);
    let overallSalesCount = 0;

    const formattedListings = listings.map((l) => {
      const salesCount = l.purchases.length;
      let listingEarnedWei = BigInt(0);
      for (const p of l.purchases) {
        try {
          listingEarnedWei += BigInt(p.amountWei);
        } catch {}
      }

      overallEarnedWei += listingEarnedWei;
      overallSalesCount += salesCount;

      return {
        id: l.id,
        chainListingId: l.chainListingId,
        authorWallet: l.authorWallet,
        title: l.title,
        description: l.description,
        category: l.category,
        priceWei: l.priceWei,
        priceEth: formatEth(l.priceWei),
        contentHash: l.contentHash,
        active: l.active,
        isDemo: l.isDemo,
        createdAt: l.createdAt.toISOString(),
        totalSales: salesCount,
        totalEarnedWei: listingEarnedWei.toString(),
        totalEarnedEth: formatEth(listingEarnedWei.toString()),
      };
    });

    return NextResponse.json({
      summary: {
        totalListings: listings.length,
        totalSales: overallSalesCount,
        totalEarnedWei: overallEarnedWei.toString(),
        totalEarnedEth: formatEth(overallEarnedWei.toString()),
      },
      listings: formattedListings,
    });
  } catch (error: any) {
    console.error("Error in GET /api/me/listings:", error);
    return NextResponse.json({ error: "Failed to fetch writer listings" }, { status: 500 });
  }
}

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

    const purchases = await prisma.purchase.findMany({
      where: { buyerWallet: sessionWallet.toLowerCase() },
      include: {
        listing: {
          select: {
            id: true,
            chainListingId: true,
            title: true,
            category: true,
            description: true,
            authorWallet: true,
            priceWei: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = purchases.map((p) => ({
      id: p.id,
      listingId: p.listingId,
      listing: {
        ...p.listing,
        priceEth: formatEth(p.listing.priceWei),
      },
      buyerWallet: p.buyerWallet,
      txHash: p.txHash,
      amountWei: p.amountWei,
      amountEth: formatEth(p.amountWei),
      blockTimestamp: Number(p.blockTimestamp),
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ purchases: formatted });
  } catch (error: any) {
    console.error("Error in GET /api/me/purchases:", error);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWallet } from "@/lib/auth";
import { formatEth, parseEthToWei, verifyAccessOnChain } from "@/lib/blockchain";

// GET /api/listings/[id] - Public details without fullText
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionWallet = await getSessionWallet();

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        chainListingId: true,
        authorWallet: true,
        title: true,
        description: true,
        category: true,
        priceWei: true,
        contentHash: true,
        createdTxHash: true,
        active: true,
        isDemo: true,
        createdAt: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    let hasAccess = false;
    const isAuthor = sessionWallet
      ? sessionWallet.toLowerCase() === listing.authorWallet.toLowerCase()
      : false;

    if (listing.isDemo) {
      // Demo pieces can be read by visitors
      hasAccess = true;
    } else if (isAuthor) {
      hasAccess = true;
    } else if (sessionWallet && listing.chainListingId >= 0) {
      // Check on-chain access
      hasAccess = await verifyAccessOnChain(listing.chainListingId, sessionWallet);
    }

    // Check if recorded in local DB purchases
    let isPurchased = false;
    if (sessionWallet) {
      const localPurchase = await prisma.purchase.findFirst({
        where: {
          listingId: listing.id,
          buyerWallet: sessionWallet.toLowerCase(),
        },
      });
      if (localPurchase) {
        isPurchased = true;
        hasAccess = true;
      }
    }

    return NextResponse.json({
      listing: {
        ...listing,
        priceEth: formatEth(listing.priceWei),
        createdAt: listing.createdAt.toISOString(),
        isAuthor,
        isPurchased,
        hasAccess,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/listings/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}

// PATCH /api/listings/[id] - Author updates price and active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionWallet = await getSessionWallet();

    if (!sessionWallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.authorWallet.toLowerCase() !== sessionWallet.toLowerCase()) {
      return NextResponse.json({ error: "Only the author can update this listing" }, { status: 403 });
    }

    const body = await req.json();
    const { priceEth, active } = body;

    const updateData: any = {};

    if (typeof active === "boolean") {
      updateData.active = active;
    }

    if (typeof priceEth === "string" && priceEth.trim()) {
      try {
        updateData.priceWei = parseEthToWei(priceEth);
      } catch {
        return NextResponse.json({ error: "Invalid ETH price" }, { status: 400 });
      }
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      listing: {
        id: updated.id,
        active: updated.active,
        priceWei: updated.priceWei,
        priceEth: formatEth(updated.priceWei),
      },
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/listings/[id]:", error);
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}

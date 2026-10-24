import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWallet } from "@/lib/auth";
import { verifyAccessOnChain } from "@/lib/blockchain";

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
        title: true,
        category: true,
        authorWallet: true,
        chainListingId: true,
        fullText: true,
        isDemo: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Demo pieces are open to preview reading
    if (listing.isDemo) {
      return NextResponse.json({
        id: listing.id,
        title: listing.title,
        category: listing.category,
        authorWallet: listing.authorWallet,
        fullText: listing.fullText,
        hasAccess: true,
      });
    }

    // Security Rule 3: Protected route requires verified session wallet
    if (!sessionWallet) {
      return NextResponse.json(
        { error: "Authentication required. Please connect and sign in with your wallet." },
        { status: 401 }
      );
    }

    const isAuthor = sessionWallet.toLowerCase() === listing.authorWallet.toLowerCase();

    // Check if user is author
    if (isAuthor) {
      return NextResponse.json({
        id: listing.id,
        title: listing.title,
        category: listing.category,
        authorWallet: listing.authorWallet,
        fullText: listing.fullText,
        hasAccess: true,
        isAuthor: true,
      });
    }

    // Security Rule 2: Verify access on the backend by calling hasAccess(listingId, walletAddress) on Sepolia
    let hasAccess = false;

    if (listing.chainListingId >= 0) {
      hasAccess = await verifyAccessOnChain(listing.chainListingId, sessionWallet);
    }

    // Fallback check against verified on-chain purchase stored in database
    if (!hasAccess) {
      const dbPurchase = await prisma.purchase.findFirst({
        where: {
          listingId: listing.id,
          buyerWallet: sessionWallet.toLowerCase(),
        },
      });
      if (dbPurchase) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied. You have not unlocked this piece yet." },
        { status: 403 }
      );
    }

    // Access confirmed! Return full text
    return NextResponse.json({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      authorWallet: listing.authorWallet,
      fullText: listing.fullText,
      hasAccess: true,
      isAuthor: false,
    });
  } catch (error: any) {
    console.error("Error in GET /api/listings/[id]/content:", error);
    return NextResponse.json(
      { error: "Failed to retrieve content" },
      { status: 500 }
    );
  }
}

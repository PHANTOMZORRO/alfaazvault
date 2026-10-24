import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWallet } from "@/lib/auth";
import { verifyPurchaseReceiptOnChain } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  try {
    const sessionWallet = await getSessionWallet();
    if (!sessionWallet) {
      return NextResponse.json(
        { error: "Unauthorized. Please connect your wallet first." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { txHash, listingId } = body;

    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
      return NextResponse.json({ error: "Valid transaction hash is required" }, { status: 400 });
    }
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json({ error: "Listing ID is required" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if transaction hash already recorded
    const existing = await prisma.purchase.findUnique({
      where: { txHash: txHash.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Purchase already recorded",
        purchaseId: existing.id,
      });
    }

    // Security Rule 4: Backend fetches transaction receipt from Sepolia and verifies
    const verification = await verifyPurchaseReceiptOnChain(
      txHash,
      listing.chainListingId,
      sessionWallet
    );

    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Transaction verification failed on Sepolia" },
        { status: 400 }
      );
    }

    // Ensure User record exists
    await prisma.user.upsert({
      where: { walletAddress: sessionWallet.toLowerCase() },
      update: {},
      create: { walletAddress: sessionWallet.toLowerCase() },
    });

    // Save purchase record in database
    const purchase = await prisma.purchase.create({
      data: {
        listingId: listing.id,
        buyerWallet: sessionWallet.toLowerCase(),
        txHash: txHash.toLowerCase(),
        amountWei: verification.amountWei || listing.priceWei,
        blockTimestamp: BigInt(verification.blockTimestamp),
      },
    });

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      txHash: purchase.txHash,
    });
  } catch (error: any) {
    console.error("Error in POST /api/purchases:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record purchase" },
      { status: 500 }
    );
  }
}

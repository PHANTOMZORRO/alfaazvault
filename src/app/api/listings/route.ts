import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWallet } from "@/lib/auth";
import {
  computeContentHash,
  formatEth,
  parseEthToWei,
  getContractInstance,
} from "@/lib/blockchain";
import { CONTRACT_ADDRESS } from "@/contracts/contractConfig";

const VALID_CATEGORIES = ["Story", "Article", "Poetry", "Shayari", "Essay", "Other"];

// GET /api/listings - Public list without fullText
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const sessionWallet = await getSessionWallet();

    const whereClause: any = {
      active: true,
    };

    if (category && category !== "All" && VALID_CATEGORIES.includes(category)) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Explicitly exclude fullText from query (Security Rule 1)
    const listings = await prisma.listing.findMany({
      where: whereClause,
      select: {
        id: true,
        chainListingId: true,
        authorWallet: true,
        title: true,
        description: true,
        category: true,
        priceWei: true,
        contentHash: true,
        active: true,
        isDemo: true,
        createdAt: true,
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check user purchases if connected
    let userPurchasedListingIds = new Set<string>();
    if (sessionWallet) {
      const purchases = await prisma.purchase.findMany({
        where: { buyerWallet: sessionWallet.toLowerCase() },
        select: { listingId: true },
      });
      userPurchasedListingIds = new Set(purchases.map((p) => p.listingId));
    }

    const formattedListings = listings.map((l) => ({
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
      purchaseCount: l._count.purchases,
      isAuthor: sessionWallet ? l.authorWallet.toLowerCase() === sessionWallet.toLowerCase() : false,
      isPurchased: userPurchasedListingIds.has(l.id),
    }));

    return NextResponse.json(
      { listings: formattedListings },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in GET /api/listings:", error);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}

// POST /api/listings - Protected: saves listing after on-chain creation (Security Rule 5)
export async function POST(req: NextRequest) {
  try {
    const sessionWallet = await getSessionWallet();
    if (!sessionWallet) {
      return NextResponse.json(
        { error: "Unauthorized. Please connect and verify your wallet." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      category,
      priceEth,
      fullText,
      chainListingId,
      createdTxHash,
    } = body;

    // Validate inputs
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (description.trim().length > 300) {
      return NextResponse.json({ error: "Description must not exceed 300 characters" }, { status: 400 });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category selected" }, { status: 400 });
    }
    if (!fullText || typeof fullText !== "string" || fullText.trim().length === 0) {
      return NextResponse.json({ error: "Full text content is required" }, { status: 400 });
    }
    if (typeof chainListingId !== "number" || chainListingId < 0) {
      return NextResponse.json({ error: "Valid chainListingId is required" }, { status: 400 });
    }
    if (!createdTxHash || typeof createdTxHash !== "string") {
      return NextResponse.json({ error: "Transaction hash is required" }, { status: 400 });
    }

    let priceWei: string;
    try {
      priceWei = parseEthToWei(priceEth);
    } catch {
      return NextResponse.json({ error: "Invalid ETH price" }, { status: 400 });
    }

    // Security Rule 5: Backend computes keccak256 of text and checks that it equals contentHash sent to contract
    const computedHash = computeContentHash(fullText);

    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      try {
        const contract = getContractInstance();
        const onChainListing = await contract.listings(chainListingId);
        const onChainAuthor = String(onChainListing.author).toLowerCase();
        const onChainContentHash = String(onChainListing.contentHash).toLowerCase();

        if (onChainAuthor !== sessionWallet.toLowerCase()) {
          return NextResponse.json(
            { error: `Author mismatch: On-chain author is ${onChainAuthor}, but session is ${sessionWallet}` },
            { status: 403 }
          );
        }

        if (onChainContentHash !== computedHash.toLowerCase()) {
          return NextResponse.json(
            {
              error: `Content hash mismatch: Keccak256 of text is ${computedHash}, but on-chain contentHash is ${onChainContentHash}`,
            },
            { status: 400 }
          );
        }
      } catch (chainErr: any) {
        console.error("Verification on contract failed:", chainErr);
        return NextResponse.json(
          { error: `Failed to verify listing on Sepolia contract: ${chainErr?.message || "Unknown error"}` },
          { status: 400 }
        );
      }
    }

    // Upsert User
    await prisma.user.upsert({
      where: { walletAddress: sessionWallet.toLowerCase() },
      update: {},
      create: { walletAddress: sessionWallet.toLowerCase() },
    });

    // Save listing
    const newListing = await prisma.listing.create({
      data: {
        chainListingId,
        authorWallet: sessionWallet.toLowerCase(),
        title: title.trim(),
        description: description.trim(),
        category,
        priceWei,
        fullText, // Stored safely in DB only
        contentHash: computedHash,
        createdTxHash: createdTxHash.trim(),
        active: true,
        isDemo: false,
      },
    });

    return NextResponse.json({
      success: true,
      id: newListing.id,
      chainListingId: newListing.chainListingId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/listings:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create listing" },
      { status: 500 }
    );
  }
}

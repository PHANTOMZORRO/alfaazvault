import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { generateNonceString, formatNonceMessage } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum wallet address" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const nonceValue = generateNonceString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await prisma.nonce.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        nonce: nonceValue,
        expiresAt,
      },
      create: {
        walletAddress: normalizedAddress,
        nonce: nonceValue,
        expiresAt,
      },
    });

    const message = formatNonceMessage(nonceValue, normalizedAddress);

    return NextResponse.json({
      nonce: nonceValue,
      message,
    });
  } catch (error: any) {
    console.error("Error in /api/auth/nonce:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

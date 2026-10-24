import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import {
  formatNonceMessage,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, signature } = body;

    if (!walletAddress || !signature || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid parameters. Wallet address and signature required." },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Fetch active nonce from database
    const nonceRecord = await prisma.nonce.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "No pending authentication request found. Please request a new nonce." },
        { status: 400 }
      );
    }

    if (new Date() > nonceRecord.expiresAt) {
      await prisma.nonce.delete({ where: { walletAddress: normalizedAddress } });
      return NextResponse.json(
        { error: "Authentication nonce expired. Please try connecting again." },
        { status: 400 }
      );
    }

    // Verify cryptographic signature
    const expectedMessage = formatNonceMessage(nonceRecord.nonce, normalizedAddress);
    let recoveredAddress: string;

    try {
      recoveredAddress = ethers.verifyMessage(expectedMessage, signature).toLowerCase();
    } catch (sigErr) {
      return NextResponse.json(
        { error: "Invalid signature format or signature verification failed." },
        { status: 401 }
      );
    }

    if (recoveredAddress !== normalizedAddress) {
      return NextResponse.json(
        { error: "Signature does not match the provided wallet address." },
        { status: 401 }
      );
    }

    // Delete used nonce to prevent replay attacks
    await prisma.nonce.delete({ where: { walletAddress: normalizedAddress } }).catch(() => {});

    // Ensure User record exists
    await prisma.user.upsert({
      where: { walletAddress: normalizedAddress },
      update: {},
      create: { walletAddress: normalizedAddress },
    });

    // Create signed JWT session
    const sessionToken = await createSessionToken(normalizedAddress);

    const response = NextResponse.json({
      success: true,
      walletAddress: normalizedAddress,
    });

    // Set secure httpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Error in /api/auth/verify:", error);
    return NextResponse.json(
      { error: "Authentication verification failed" },
      { status: 500 }
    );
  }
}

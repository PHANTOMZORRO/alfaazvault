import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";

export async function GET() {
  const walletAddress = await getSessionWallet();
  return NextResponse.json({
    authenticated: Boolean(walletAddress),
    walletAddress,
  });
}

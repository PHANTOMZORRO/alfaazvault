import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ethers } from "ethers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "alfaazvault_super_secret_jwt_sepolia_session_token_key_change_me";
const secretKey = new TextEncoder().encode(JWT_SECRET);
export const SESSION_COOKIE_NAME = "alfaazvault_session";

export function formatNonceMessage(nonce: string, walletAddress: string): string {
  return [
    "Welcome to AlfaazVault - Words worth unlocking.",
    "",
    "Sign this message to securely verify ownership of your wallet.",
    "This request will not trigger any blockchain transaction or cost any gas.",
    "",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function createSessionToken(walletAddress: string): Promise<string> {
  const normalized = walletAddress.toLowerCase();
  return await new SignJWT({ walletAddress: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<{ walletAddress: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.walletAddress === "string") {
      return { walletAddress: payload.walletAddress.toLowerCase() };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionWallet(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return null;

    const verified = await verifySessionToken(sessionToken);
    return verified ? verified.walletAddress : null;
  } catch {
    return null;
  }
}

export function generateNonceString(): string {
  return ethers.hexlify(ethers.randomBytes(16)).replace("0x", "");
}

# AlfaazVault

> **Words worth unlocking.**  
> A decentralized marketplace where writers sell short written works (stories, articles, poetry, shayari, essays) for Sepolia ETH, and readers pay to unlock and read them on-chain.

---

## 📖 Overview

AlfaazVault connects writers and readers directly through Ethereum smart contracts on the **Sepolia Test Network**:
- **Writer Privacy & Sovereignty**: Writers set their title, category, teaser description, and price in ETH. The full text remains securely stored in the database and is never revealed to the browser or public API routes.
- **On-chain Access Verification**: Readers purchase access by sending the exact ETH price to the smart contract via MetaMask. The backend cryptographically validates the on-chain receipt and calls `hasAccess(listingId, userWallet)` before streaming the full text.
- **Session Authentication (EIP-191)**: Secure, gasless login using MetaMask `personal_sign` and short-lived httpOnly JWT session cookies.
- **Multilingual Typography**: Tailored typography supporting English (Lora serif), Urdu (Noto Nastaliq Urdu with automatic RTL text direction), and Hindi (Noto Sans Devanagari).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a curated sky-blue light palette
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with SQLite for development (easily switchable to PostgreSQL)
- **Web3 / Blockchain**: [ethers.js v6](https://docs.ethers.org/v6/)
- **Wallet**: MetaMask (`window.ethereum` via `ethers.BrowserProvider`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Session Security**: [jose](https://github.com/panva/jose) (JWT) + cryptographic signatures

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v20/v24)
- **MetaMask** browser extension installed
- A Sepolia testnet account with test ETH

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in the required values:
```env
# Database connection (SQLite default)
DATABASE_URL="file:./dev.db"

# Secret key used for signing session JWT tokens
JWT_SECRET="alfaazvault_super_secret_jwt_sepolia_session_token_key_change_me"

# Deployed Smart Contract Address on Sepolia Testnet
# Fill this with the address obtained after deploying the AlfaazVault contract in Remix
NEXT_PUBLIC_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"

# Sepolia RPC URL for backend on-chain access verification and receipt parsing
SEPOLIA_RPC_URL="https://rpc.sepolia.org"

# Sepolia Chain ID (11155111)
NEXT_PUBLIC_CHAIN_ID="11155111"
```

### 4. Initialize Database Schema & Seed Demo Listings
```bash
# Push Prisma schema to SQLite
npm run prisma:push

# Seed authentic multilingual demo pieces (Urdu, Hindi, English)
npm run seed
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Values You Need to Fill In

Before creating live on-chain listings and executing live purchases, configure the following:

| Configuration Item | Location | Description |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_CONTRACT_ADDRESS`** | `.env` | The contract address after deploying your smart contract to the Sepolia test network in Remix. |
| **`SEPOLIA_RPC_URL`** | `.env` | A reliable Sepolia RPC provider endpoint (e.g., from [Alchemy](https://www.alchemy.com/), [Infura](https://www.infura.io/), or the public `https://rpc.sepolia.org`). |
| **`CONTRACT_ABI`** | `src/contracts/AlfaazVaultABI.json` | Pre-populated with your contract's functions (`createListing`, `updateListing`, `buy`, `hasAccess`, `listings`, and events `ListingCreated`, `Purchased`). If you modify any parameters or events in Solidity, update this file. |
| **`JWT_SECRET`** | `.env` | Any strong random string to sign session cookies. |

---

## 🚰 How to Get Sepolia Test ETH

You need Sepolia ETH to pay gas fees and purchase works on the testnet. Free faucets include:
- **Google Cloud Web3 Faucet**: [cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (instant, 0.05 Sepolia ETH/day)
- **Alchemy Sepolia Faucet**: [sepoliafaucet.com](https://sepoliafaucet.com)
- **Infura Sepolia Faucet**: [www.infura.io/faucet/sepolia](https://www.infura.io/faucet/sepolia)
- **PoW Faucet**: [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/)

---

## 🔒 Security Architecture

1. **Zero Text Leakage**: Full text is excluded from public browse/detail endpoints (`GET /api/listings`, `GET /api/listings/[id]`). It can only be fetched via `GET /api/listings/[id]/content`.
2. **On-Chain Backend Access Verification**: The backend calls `hasAccess(listingId, walletAddress)` on Sepolia using an independent `ethers.JsonRpcProvider`. The frontend's claims of payment are never trusted blindly.
3. **Cryptographic Proof of Ownership**: Nonce-based authentication via MetaMask `personal_sign` (EIP-191). The recovered signer is validated with `ethers.verifyMessage` before setting an `httpOnly` JWT session cookie.
4. **Receipt Validation**: When recording a purchase (`POST /api/purchases`), the backend fetches the Sepolia receipt, checks `status === 1`, verifies the recipient is `NEXT_PUBLIC_CONTRACT_ADDRESS`, and validates the `Purchased` event payload for that listing and buyer.
5. **Keccak256 Integrity Check**: When listing a work, the backend computes `keccak256(toUtf8Bytes(text))` and checks that it matches the `contentHash` emitted on-chain.
6. **XSS Protection**: All user texts are sanitized and rendered as plain text within React without `dangerouslySetInnerHTML`.

---

## ⚖️ Notice
*Test network only. Readers can copy what they read, so only publish work you are comfortable sharing.*

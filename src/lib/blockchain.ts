import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/contracts/contractConfig";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

export function getSepoliaProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

export function getContractInstance(runner?: ethers.ContractRunner): ethers.Contract {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("CONTRACT_NOT_CONFIGURED");
  }
  const provider = runner || getSepoliaProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export function computeContentHash(fullText: string): string {
  // Normalize line endings to avoid hashing mismatches across operating systems
  const normalizedText = fullText.replace(/\r\n/g, "\n");
  const bytes = ethers.toUtf8Bytes(normalizedText);
  return ethers.keccak256(bytes);
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(wei: string | bigint | number): string {
  try {
    const val = typeof wei === "string" ? wei : wei.toString();
    const formatted = ethers.formatEther(val);
    // Trim unnecessary trailing zeros if decimal
    if (formatted.includes(".")) {
      const trimmed = formatted.replace(/\.?0+$/, "");
      return trimmed === "" ? "0" : trimmed;
    }
    return formatted;
  } catch {
    return "0";
  }
}

export function parseEthToWei(eth: string): string {
  try {
    return ethers.parseEther(eth.trim()).toString();
  } catch (err) {
    throw new Error(`Invalid ETH amount: ${eth}`);
  }
}

/**
 * Security Rule 2: Verify access on the backend by calling hasAccess(listingId, walletAddress) on Sepolia
 */
export async function verifyAccessOnChain(
  chainListingId: number,
  walletAddress: string
): Promise<boolean> {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    // If contract is not yet configured, log warning
    console.warn("verifyAccessOnChain: NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
    return false;
  }

  try {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 3000)
    );
    const accessPromise = (async () => {
      const provider = getSepoliaProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const res = await contract.hasAccess(chainListingId, walletAddress);
      return Boolean(res);
    })();
    return await Promise.race([accessPromise, timeoutPromise]);
  } catch (error) {
    console.error(`Error checking hasAccess(${chainListingId}, ${walletAddress}):`, error);
    return false;
  }
}

/**
 * Security Rule 4: Verify purchase transaction receipt on Sepolia
 * - fetches transaction receipt by hash from Sepolia
 * - confirms it succeeded (status === 1)
 * - confirms it was sent to our contract address
 * - confirms it contains a Purchased event for that listing id and that buyer address
 */
export async function verifyPurchaseReceiptOnChain(
  txHash: string,
  expectedChainListingId: number,
  expectedBuyer: string
): Promise<{
  success: boolean;
  amountWei: string;
  blockTimestamp: number;
  error?: string;
}> {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { success: false, amountWei: "0", blockTimestamp: 0, error: "Contract address is not configured in .env" };
  }

  try {
    const provider = getSepoliaProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { success: false, amountWei: "0", blockTimestamp: 0, error: "Transaction receipt not found on Sepolia yet. It may still be pending." };
    }

    if (receipt.status !== 1) {
      return { success: false, amountWei: "0", blockTimestamp: 0, error: "Transaction failed on Sepolia (reverted)." };
    }

    if (!receipt.to || receipt.to.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      return {
        success: false,
        amountWei: "0",
        blockTimestamp: 0,
        error: `Transaction was sent to ${receipt.to}, not to contract ${CONTRACT_ADDRESS}`,
      };
    }

    // Parse events using contract interface
    const contractInterface = new ethers.Interface(CONTRACT_ABI);
    let matchedEvent: {
      id: bigint;
      buyer: string;
      author: string;
      amount: bigint;
      timestamp?: bigint;
    } | null = null;

    for (const log of receipt.logs) {
      // Check if log is from our contract
      if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;

      try {
        const parsed = contractInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed && parsed.name === "Purchased") {
          const id = BigInt(parsed.args.id);
          const buyer = String(parsed.args.buyer).toLowerCase();
          const author = String(parsed.args.author).toLowerCase();
          const amount = BigInt(parsed.args.amount);
          const timestamp = parsed.args.timestamp ? BigInt(parsed.args.timestamp) : undefined;

          if (Number(id) === expectedChainListingId && buyer === expectedBuyer.toLowerCase()) {
            matchedEvent = { id, buyer, author, amount, timestamp };
            break;
          }
        }
      } catch {
        // Skip logs that don't match this interface
      }
    }

    if (!matchedEvent) {
      return {
        success: false,
        amountWei: "0",
        blockTimestamp: 0,
        error: `No matching 'Purchased' event found for listing #${expectedChainListingId} and buyer ${expectedBuyer}`,
      };
    }

    // Determine timestamp
    let blockTimestamp = 0;
    if (matchedEvent.timestamp) {
      blockTimestamp = Number(matchedEvent.timestamp);
    } else {
      const block = await provider.getBlock(receipt.blockNumber);
      blockTimestamp = block ? block.timestamp : Math.floor(Date.now() / 1000);
    }

    return {
      success: true,
      amountWei: matchedEvent.amount.toString(),
      blockTimestamp,
    };
  } catch (error: any) {
    console.error("verifyPurchaseReceiptOnChain error:", error);
    return {
      success: false,
      amountWei: "0",
      blockTimestamp: 0,
      error: error?.message || "Failed to verify transaction on Sepolia",
    };
  }
}

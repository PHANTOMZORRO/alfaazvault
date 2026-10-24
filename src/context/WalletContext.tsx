"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_ID_HEX } from "@/contracts/contractConfig";
import { computeContentHash } from "@/lib/blockchain";

export type BuyStatus = "idle" | "switching_network" | "metamask_prompt" | "waiting_tx" | "verifying_backend" | "success" | "error";

interface WalletContextType {
  walletAddress: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  purchasedListingIds: Set<string>;
  connectWallet: () => Promise<string | null>;
  authenticateSession: (addressToAuth?: string) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  switchAccount: () => Promise<string | null>;
  switchToSepolia: () => Promise<boolean>;
  buyListing: (
    chainListingId: number,
    listingDbId: string,
    priceWei: string,
    onStatusChange?: (status: BuyStatus, message?: string) => void
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  createListingOnChain: (
    priceWei: string,
    fullText: string
  ) => Promise<{ chainListingId: number; txHash: string }>;
  updateListingOnChain: (
    chainListingId: number,
    newPriceWei: string,
    active: boolean
  ) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [purchasedListingIds, setPurchasedListingIds] = useState<Set<string>>(new Set());

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  const refreshPurchases = useCallback(async () => {
    try {
      const res = await fetch("/api/me/purchases", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.purchases)) {
          const ids = new Set<string>(data.purchases.map((p: any) => p.listing.id));
          setPurchasedListingIds(ids);
        }
      }
    } catch {}
  }, []);

  // Check existing session on mount
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.walletAddress) {
            setIsAuthenticated(true);
            setWalletAddress(data.walletAddress);
            refreshPurchases();
          }
        }
      } catch (err) {
        console.error("Failed to check session:", err);
      }
    }
    checkCurrentSession();
  }, [refreshPurchases]);

  // Update chainId and accounts when ethereum object is available
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // Disconnected
        setWalletAddress(null);
        setIsAuthenticated(false);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      } else {
        const newAddress = accounts[0].toLowerCase();
        setWalletAddress(newAddress);
        // Clear previous account's cookie session immediately
        setIsAuthenticated(false);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        // Authenticate new account session
        authenticateSession(newAddress);
      }
    };

    const handleChainChanged = (chainHex: string) => {
      setChainId(parseInt(chainHex, 16));
    };

    // Query current chain
    ethereum.request({ method: "eth_chainId" }).then((chainHex: string) => {
      setChainId(parseInt(chainHex, 16));
    }).catch(() => {});

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Switch to Sepolia Testnet
  const switchToSepolia = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("MetaMask is required to connect to AlfaazVault.");
      return false;
    }
    const ethereum = (window as any).ethereum;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      setChainId(SEPOLIA_CHAIN_ID);
      return true;
    } catch (switchError: any) {
      // User cancelled request
      if (switchError?.code === 4001) {
        return false;
      }

      // If chain not added or unrecognized, request to add Sepolia
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "Sepolia Ether",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [
                "https://ethereum-sepolia-rpc.publicnode.com",
                "https://rpc2.sepolia.org",
              ],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        setChainId(SEPOLIA_CHAIN_ID);
        return true;
      } catch (addError: any) {
        if (addError?.code !== 4001) {
          console.warn("Please switch to Sepolia manually in your MetaMask network selector.");
        }
        return false;
      }
    }
  }, []);

  // Authenticate session via personal_sign (Security Rule 3)
  const authenticateSession = useCallback(
    async (addressToAuth?: string): Promise<boolean> => {
      const targetAddress = (addressToAuth || walletAddress)?.toLowerCase();
      if (!targetAddress) return false;
      if (typeof window === "undefined" || !(window as any).ethereum) return false;

      setIsAuthenticating(true);
      try {
        // Step 1: Request nonce from backend
        const nonceRes = await fetch("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: targetAddress }),
        });

        if (!nonceRes.ok) {
          throw new Error("Failed to generate authentication challenge");
        }

        const { message } = await nonceRes.json();

        // Step 2: Sign message with MetaMask (personal_sign)
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const signature = await signer.signMessage(message);

        // Step 3: Verify signature with backend and obtain session cookie
        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: targetAddress,
            signature,
          }),
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json();
          throw new Error(errData.error || "Signature verification failed");
        }

        setIsAuthenticated(true);
        return true;
      } catch (err: any) {
        console.error("Authentication failed:", err);
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [walletAddress]
  );

  // Connect MetaMask
  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to use AlfaazVault.");
      return null;
    }
    const ethereum = (window as any).ethereum;

    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      // Check network
      const currentChain = await ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentChain, 16);
      setChainId(currentChainId);

      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia();
      }

      // Authenticate session cookie with backend
      await authenticateSession(address);

      return address;
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [switchToSepolia, authenticateSession]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    setWalletAddress(null);
    setIsAuthenticated(false);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  // Switch account using MetaMask permissions prompt
  const switchAccount = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("MetaMask is required.");
      return null;
    }
    const ethereum = (window as any).ethereum;

    try {
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        const newAddress = accounts[0].toLowerCase();
        setWalletAddress(newAddress);
        await authenticateSession(newAddress);
        return newAddress;
      }
      return null;
    } catch (err: any) {
      if (err?.code !== 4001) {
        console.warn("Account switch error:", err);
      }
      return null;
    }
  }, [authenticateSession]);

  // Buy listing on smart contract (Buy Flow steps 1-4)
  const buyListing = useCallback(
    async (
      chainListingId: number,
      listingDbId: string,
      priceWei: string,
      onStatusChange?: (status: BuyStatus, message?: string) => void
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        return { success: false, error: "MetaMask not detected" };
      }

      // Check connection
      let currentAddress = walletAddress;
      if (!currentAddress) {
        currentAddress = await connectWallet();
        if (!currentAddress) {
          return { success: false, error: "Wallet not connected" };
        }
      }

      // Check Sepolia network
      if (chainId !== SEPOLIA_CHAIN_ID) {
        onStatusChange?.("switching_network", "Please switch to Sepolia Testnet in MetaMask");
        const switched = await switchToSepolia();
        if (!switched) {
          return { success: false, error: "Must be on Sepolia Testnet to buy" };
        }
      }

      // Ensure user has backend authenticated session
      if (!isAuthenticated) {
        const authed = await authenticateSession(currentAddress);
        if (!authed) {
          return { success: false, error: "Wallet verification signature required to confirm purchases" };
        }
      }

      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        return {
          success: false,
          error: "Smart contract address is not configured yet. Please configure NEXT_PUBLIC_CONTRACT_ADDRESS in .env.",
        };
      }

      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        onStatusChange?.("metamask_prompt", "Confirm the purchase transaction in MetaMask...");

        // Call buy(id) payable with exact listing price
        const tx = await contract.buy(chainListingId, {
          value: BigInt(priceWei),
        });

        onStatusChange?.("waiting_tx", `Transaction submitted (${tx.hash.slice(0, 10)}...). Waiting for block confirmation...`);

        // Wait for on-chain inclusion
        const receipt = await tx.wait();

        if (!receipt || receipt.status !== 1) {
          throw new Error("Transaction reverted on-chain");
        }

        onStatusChange?.("verifying_backend", "Payment confirmed on-chain! Verifying and unlocking with AlfaazVault...");

        // POST txHash to /api/purchases (Security Rule 4)
        const purchaseRes = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: tx.hash,
            listingId: listingDbId,
          }),
        });

        if (!purchaseRes.ok) {
          const errData = await purchaseRes.json();
          throw new Error(errData.error || "Failed to record purchase on backend");
        }

        setPurchasedListingIds((prev) => new Set(prev).add(listingDbId));
        onStatusChange?.("success", "Unlocked! Content is now available.");
        return { success: true, txHash: tx.hash };
      } catch (err: any) {
        console.error("Buy transaction error:", err);
        const errMsg = err?.reason || err?.message || "Transaction failed";
        onStatusChange?.("error", errMsg);
        return { success: false, error: errMsg };
      }
    },
    [walletAddress, chainId, isAuthenticated, connectWallet, switchToSepolia, authenticateSession]
  );

  // Create listing on smart contract
  const createListingOnChain = useCallback(
    async (
      priceWei: string,
      fullText: string
    ): Promise<{ chainListingId: number; txHash: string }> => {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("MetaMask is required");
      }

      if (chainId !== SEPOLIA_CHAIN_ID) {
        const switched = await switchToSepolia();
        if (!switched) throw new Error("Must switch to Sepolia network");
      }

      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("Contract address is not configured yet in .env");
      }

      const contentHash = computeContentHash(fullText);

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call createListing(uint256 price, bytes32 contentHash)
      const tx = await contract.createListing(BigInt(priceWei), contentHash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Contract transaction failed");
      }

      // Read new listing id from ListingCreated event in the receipt
      const contractInterface = new ethers.Interface(CONTRACT_ABI);
      let chainListingId: number | null = null;

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          try {
            const parsed = contractInterface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (parsed && parsed.name === "ListingCreated") {
              chainListingId = Number(parsed.args.id);
              break;
            }
          } catch {}
        }
      }

      if (chainListingId === null) {
        throw new Error("ListingCreated event not found in transaction receipt");
      }

      return {
        chainListingId,
        txHash: tx.hash,
      };
    },
    [chainId, switchToSepolia]
  );

  // Update listing on smart contract
  const updateListingOnChain = useCallback(
    async (
      chainListingId: number,
      newPriceWei: string,
      active: boolean
    ): Promise<string> => {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("MetaMask is required");
      }

      if (chainId !== SEPOLIA_CHAIN_ID) {
        const switched = await switchToSepolia();
        if (!switched) throw new Error("Must switch to Sepolia network");
      }

      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("Contract address is not configured yet in .env");
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.updateListing(chainListingId, BigInt(newPriceWei), active);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Contract update transaction failed");
      }

      return tx.hash;
    },
    [chainId, switchToSepolia]
  );

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        chainId,
        isCorrectNetwork,
        isConnecting,
        isAuthenticating,
        isAuthenticated,
        purchasedListingIds,
        connectWallet,
        authenticateSession,
        disconnectWallet,
        switchAccount,
        switchToSepolia,
        buyListing,
        createListingOnChain,
        updateListingOnChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

import React from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/contracts/contractConfig";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-vault-soft border-t border-vault-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-vault-cardTint border border-vault-border flex items-center justify-center text-vault-primary">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-vault-text">
                Alfaaz<span className="text-vault-primary">Vault</span>
              </span>
            </div>
            <p className="text-sm text-vault-muted max-w-md">
              A decentralized marketplace where writers publish stories, poetry, shayari, articles, and essays for ETH, and readers unlock authentic literature directly on Sepolia.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-vault-cardTint text-vault-primary border border-vault-border">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sepolia Testnet (Chain ID 11155111)</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-vault-text mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-vault-muted">
              <li>
                <Link href="/" className="hover:text-vault-primary transition-colors">
                  Browse Works
                </Link>
              </li>
              <li>
                <Link href="/write" className="hover:text-vault-primary transition-colors">
                  Publish Writing
                </Link>
              </li>
              <li>
                <Link href="/library" className="hover:text-vault-primary transition-colors">
                  My Library
                </Link>
              </li>
              <li>
                <Link href="/my-listings" className="hover:text-vault-primary transition-colors">
                  Writer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-vault-primary transition-colors">
                  Transaction History
                </Link>
              </li>
            </ul>
          </div>

          {/* Contract & Testnet links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-vault-text mb-3">
              Network & Contract
            </h4>
            <ul className="space-y-2 text-sm text-vault-muted">
              {CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" ? (
                <li>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-vault-primary transition-colors"
                  >
                    <span>View Contract</span>
                    <ExternalLink className="w-3.5 h-3.5 text-vault-accent" />
                  </a>
                </li>
              ) : (
                <li className="text-xs text-amber-700">Contract unconfigured in .env</li>
              )}
              <li>
                <a
                  href="https://sepoliafaucet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-vault-primary transition-colors"
                >
                  <span>Sepolia Faucet</span>
                  <ExternalLink className="w-3.5 h-3.5 text-vault-accent" />
                </a>
              </li>
              <li>
                <a
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-vault-primary transition-colors"
                >
                  <span>Google Cloud Faucet</span>
                  <ExternalLink className="w-3.5 h-3.5 text-vault-accent" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Required Notice */}
        <div className="mt-8 pt-6 border-t border-vault-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-vault-muted text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} AlfaazVault. Words worth unlocking.
          </p>
          <p className="bg-white px-3 py-1.5 rounded-lg border border-vault-border text-vault-muted max-w-xl text-[11px] leading-relaxed">
            <strong>Notice:</strong> Test network only. Readers can copy what they read, so only publish work you are comfortable sharing.
          </p>
        </div>
      </div>
    </footer>
  );
};

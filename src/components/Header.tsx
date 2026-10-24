"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Key, Menu, X, AlertTriangle, ShieldCheck, LogOut, ChevronDown, Users } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { formatAddress } from "@/lib/blockchain";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    walletAddress,
    isCorrectNetwork,
    isConnecting,
    isAuthenticating,
    isAuthenticated,
    connectWallet,
    disconnectWallet,
    switchAccount,
    switchToSepolia,
    authenticateSession,
  } = useWallet();

  const navLinks = [
    { name: "Browse", href: "/" },
    { name: "Write", href: "/write" },
    { name: "My Library", href: "/library" },
    { name: "My Listings", href: "/my-listings" },
    { name: "History", href: "/history" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-vault-border shadow-sm">
      {/* Network alert banner if connected to wrong network */}
      {walletAddress && !isCorrectNetwork && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs sm:text-sm text-amber-900 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>You are connected to the wrong network. AlfaazVault operates on <strong>Sepolia Testnet</strong>.</span>
          <button
            onClick={() => switchToSepolia()}
            className="ml-2 font-semibold text-vault-primary hover:underline underline-offset-2"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-95"
            id="nav-logo"
          >
            <div className="w-9 h-9 rounded-lg bg-vault-cardTint border border-vault-border flex items-center justify-center text-vault-accent shadow-xs group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-vault-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-vault-text">
                Alfaaz<span className="text-vault-primary">Vault</span>
              </span>
              <span className="text-[10px] text-vault-muted font-normal tracking-wide hidden sm:block -mt-1">
                Words worth unlocking.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-vault-primary bg-vault-soft font-semibold"
                      : "text-vault-muted hover:text-vault-text hover:bg-vault-cardTint/50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Connection / Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {!walletAddress ? (
              <button
                onClick={() => connectWallet()}
                disabled={isConnecting}
                id="btn-connect-wallet"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vault-primary hover:bg-vault-primaryHover text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <Key className="w-4 h-4 text-sky-200" />
                <span>{isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  id="btn-wallet-dropdown"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-vault-border bg-vault-soft hover:bg-vault-cardTint text-vault-text text-xs sm:text-sm font-mono font-medium transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCorrectNetwork ? "bg-vault-success" : "bg-amber-500"
                    }`}
                  />
                  <span>{formatAddress(walletAddress)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-vault-muted" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-vault-border shadow-vaultHover p-2 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-vault-border mb-1">
                      <p className="text-xs text-vault-muted">Connected Account</p>
                      <p className="font-mono text-xs font-semibold text-vault-text truncate">
                        {walletAddress}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            isCorrectNetwork ? "bg-vault-success" : "bg-vault-error"
                          }`}
                        />
                        <span className="text-[11px] text-vault-muted">
                          {isCorrectNetwork ? "Sepolia Testnet" : "Wrong Network"}
                        </span>
                      </div>
                    </div>

                    {!isAuthenticated && (
                      <button
                        onClick={() => {
                          authenticateSession();
                          setDropdownOpen(false);
                        }}
                        disabled={isAuthenticating}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg text-vault-primary hover:bg-vault-cardTint font-medium flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isAuthenticating ? "Signing..." : "Verify Session Sign-in"}</span>
                      </button>
                    )}

                    {!isCorrectNetwork && (
                      <button
                        onClick={() => {
                          switchToSepolia();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg text-amber-700 hover:bg-amber-50 font-medium flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Switch to Sepolia</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        switchAccount();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg text-vault-text hover:bg-vault-cardTint font-medium flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-vault-primary" />
                      <span>Switch / Connect Account</span>
                    </button>

                    <button
                      onClick={() => {
                        disconnectWallet();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg text-vault-error hover:bg-red-50 font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            {!walletAddress ? (
              <button
                onClick={() => connectWallet()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-vault-primary text-white"
              >
                Connect
              </button>
            ) : (
              <span className="text-xs font-mono px-2 py-1 bg-vault-soft border border-vault-border rounded text-vault-text">
                {formatAddress(walletAddress)}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-vault-muted hover:text-vault-text hover:bg-vault-soft"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-vault-border space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium ${
                    isActive
                      ? "text-vault-primary bg-vault-soft font-semibold"
                      : "text-vault-muted hover:text-vault-text hover:bg-vault-soft"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            {walletAddress && (
              <div className="pt-2 border-t border-vault-border">
                <button
                  onClick={() => {
                    disconnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-vault-error hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

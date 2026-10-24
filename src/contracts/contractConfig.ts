import AlfaazVaultABI from "./AlfaazVaultABI.json";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export { AlfaazVaultABI };

export const CONTRACT_ABI = AlfaazVaultABI;

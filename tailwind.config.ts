import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#FFFFFF",
          soft: "#F0F9FF",
          cardTint: "#E0F2FE",
          border: "#BAE6FD",
          accent: "#38BDF8",
          primary: "#0369A1",
          primaryHover: "#075985",
          text: "#0C2A3F",
          muted: "#475569",
          success: "#0F9D58",
          error: "#D93025",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-lora)", "'Noto Sans Devanagari'", "'Noto Nastaliq Urdu'", "Georgia", "serif"],
        devanagari: ["'Noto Sans Devanagari'", "sans-serif"],
        nastaliq: ["'Noto Nastaliq Urdu'", "serif"],
      },
      boxShadow: {
        vault: "0 2px 8px -2px rgba(56, 189, 248, 0.12), 0 1px 4px -1px rgba(12, 42, 63, 0.06)",
        vaultHover: "0 8px 24px -4px rgba(56, 189, 248, 0.22), 0 2px 6px -1px rgba(12, 42, 63, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

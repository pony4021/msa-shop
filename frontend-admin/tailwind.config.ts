// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#d9eaff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af"
        },
      },
      boxShadow: {
        soft: "0 12px 28px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

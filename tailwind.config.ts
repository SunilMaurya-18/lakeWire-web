import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        raised: "#0C0C0F",
        well: "#141418",
        slate: "#8B8B93",
        brass: "#C9A227",
        line: "rgba(255,255,255,0.09)",
      },
      fontFamily: {
        sans: ["var(--font-tight)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
      },
      transitionTimingFunction: {
        lake: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        ui: "520ms",
      },
    },
  },
  plugins: [],
};

export default config;

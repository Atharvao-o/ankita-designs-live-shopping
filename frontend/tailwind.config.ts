import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F1E6",
        surface: "#FFFDF8",
        panel: "#F4E8D8",
        primary: "#8A5A24",
        secondary: "#C59A4A",
        cta: "#E95F45",
        success: "#168A54",
        ink: "#17120C",
        muted: "#7B7065",
        borderSoft: "rgba(90, 64, 31, 0.14)",
        liveDark: "#070A0F",
        gold: "#C59A4A",
        cream: "#FFF7EB",
        coral: "#E95F45",
        charcoal: "#17120C"
      },
      fontFamily: {
        display: [
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        sans: [
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        serif: [
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 24px 70px rgba(80, 52, 20, 0.10)",
        glow: "0 18px 44px rgba(197, 154, 74, 0.22)",
        luxury: "0 30px 90px rgba(80, 52, 20, 0.14)",
        darkGlow: "0 30px 90px rgba(0, 0, 0, 0.32)"
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseRing: "pulseRing 2s ease-out infinite",
        confetti: "confetti 2.8s ease-out forwards"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" }
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.08)", opacity: "0.15" },
          "100%": { transform: "scale(1.12)", opacity: "0" }
        },
        confetti: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(280px) rotate(320deg)", opacity: "0" }
        }
      }
    }
  },
  plugins: []
};

export default config;

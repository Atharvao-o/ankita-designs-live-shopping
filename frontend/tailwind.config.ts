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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        muted: "var(--muted-surface)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border-token)",
        input: "var(--input)",
        ring: "var(--ring)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        surface: "var(--card)",
        panel: "var(--muted-surface)",
        cta: "var(--marketplace-orange)",
        success: "var(--success)",
        ink: "var(--foreground)",
        borderSoft: "var(--border-token)",
        liveDark: "#070A0F",
        gold: "var(--gold)",
        cream: "var(--bg-soft)",
        coral: "var(--coral)",
        charcoal: "var(--foreground)"
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
        soft: "var(--shadow-soft)",
        strong: "var(--shadow-strong)",
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

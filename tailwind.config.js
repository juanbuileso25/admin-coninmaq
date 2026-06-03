/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Poppins'", "sans-serif"],
      },
      colors: {
        accent:          "#FFC837",
        "accent-light":  "#FFD55C",
        "accent-dark":   "#E6A800",
        "accent-muted":  "rgba(255,200,55,0.12)",
        surface:         "var(--surface)",
        "surface-2":     "var(--surface-2)",
        "surface-3":     "var(--surface-3)",
        "surface-4":     "var(--surface-4)",
        "surface-5":     "var(--surface-5)",
        border:          "var(--border)",
        "border-light":  "var(--border-light)",
        fg: {
          DEFAULT: "var(--fg)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
          5: "var(--fg-5)",
          6: "var(--fg-6)",
          7: "var(--fg-7)",
        },
      },
      boxShadow: {
        glow:      "0 0 32px rgba(255,200,55,0.20)",
        "glow-sm": "0 0 14px rgba(255,200,55,0.14)",
        "glow-xs": "0 0 6px  rgba(255,200,55,0.10)",
        card:      "0 4px 32px rgba(0,0,0,0.50)",
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(rgba(255,200,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,55,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease forwards",
        "fade-up":    "fadeUp 0.5s ease forwards",
        "slide-in":   "slideIn 0.35s ease forwards",
        shimmer:      "shimmer 2.2s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15162b",
        indigo: {
          DEFAULT: "#0d08d2",
          600: "#0d08d2",
        },
        emerald: {
          DEFAULT: "#28a745",
        },
        amber: {
          DEFAULT: "#ff8b00",
        },
        fog: "#f7f7fb",
        bordergray: "#e6e6f0",
        "text-secondary": "#595b78",
        "text-muted": "#8a8ca6",
        critical: "#e63946",
        info: "#00acff",
        "accent-yellow": "#ffcc00",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["'Barlow Semi Condensed'", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        panel: "0 2px 8px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        card: "14px",
        btn: "8px",
        input: "8px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

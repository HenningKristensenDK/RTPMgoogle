/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        indigo: {
          DEFAULT: "#4F46E5",
          600: "#4F46E5",
        },
        emerald: {
          DEFAULT: "#10B981",
        },
        amber: {
          DEFAULT: "#F59E0B",
        },
        fog: "#F3F4F6",
        bordergray: "#E5E7EB",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        panel: "0 2px 8px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        input: "4px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

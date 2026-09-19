import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#09090B",
        surface: "#15151A",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(109, 40, 217, 0.22)",
      },
    },
  },
  plugins: [],
} satisfies Config;


import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Noto Sans KR'", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#fef9ee",
          100: "#fdf0d1",
          200: "#fbdea3",
          300: "#f8c56a",
          400: "#f5a630",
          500: "#f38c12",
          600: "#e4700a",
          700: "#bd530c",
          800: "#974111",
          900: "#7a3612",
        },
      },
    },
  },
  plugins: [],
};
export default config;

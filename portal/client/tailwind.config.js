/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        condensed: ["Barlow Condensed", "system-ui", "sans-serif"],
      },
      colors: {
        oak: {
          cream: "#FAFAF8",
          ink: "#1C2211",
          dark: "#232C17",
          darker: "#191F10",
          sage: "#5A6350",
          sagelight: "#8A9280",
          gold: "#E4C386",
          goldlight: "#F0DDB0",
          line: "#E4E2DA",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,34,17,0.06), 0 1px 1px rgba(28,34,17,0.04)",
        pop: "0 8px 24px rgba(28,34,17,0.14)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1F2937", // Dark gray
        secondary: {
          DEFAULT: "#4B5563", // Medium gray
          100: "#6B7280", // Lighter medium gray
          200: "#9CA3AF", // Even lighter medium gray
        },
        black: {
          DEFAULT: "#000000", // Black
          100: "#111827", // Very dark gray
          200: "#1F2937", // Dark gray
        },
        gray: {
          50: "#F9FAFB", // Very light gray
          100: "#F3F4F6", // Light gray
          200: "#E5E7EB", // Lighter gray
          300: "#D1D5DB", // Light gray
          400: "#9CA3AF", // Medium gray
          500: "#6B7280", // Medium gray
          600: "#4B5563", // Darker medium gray
          700: "#374151", // Dark gray
          800: "#1F2937", // Darker gray
          900: "#111827", // Very dark gray
        },
      },
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },
    },
  },
  plugins: [],
};
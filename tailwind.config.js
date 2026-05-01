/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#04050F",
        "ink-2": "#080A1A",
        "ink-3": "#0D1030",
        "vi-blue": "#1E5FFF",
        "vi-blue-l": "#4C87FF",
        "vi-purple": "#7C3AED",
        "vi-green": "#25D366",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

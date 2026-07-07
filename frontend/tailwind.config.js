/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: "#0d1117",
        sidebar: "#111820",
        cardCustom: "#161e28",
        card2Custom: "#1c2532",
        goldCustom: "#c9a84c",
        gold2Custom: "#e8c96a",
        greenCustom: "#00c97a",
        redCustom: "#e05555",
        blueCustom: "#4a9eff",
        textCustom: "#e8edf2",
        mutedCustom: "#5a6a7a",
        borderCustom: "#1e2d3d",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}

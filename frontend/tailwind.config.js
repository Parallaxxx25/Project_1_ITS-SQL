/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        primary: '#1e3a8a',
        'gradient-start': '#1e3a8a',
        'gradient-end': '#ff8c00',
      },
      // ✨ เพิ่ม Custom Animation สำหรับ AI Bot ตรงนี้
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}
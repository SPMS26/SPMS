/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#050505',
        bgSidebar: '#0A0A0A',
        bgCard: '#0A0A0A',
        bgCardHover: '#151515',
        bgInput: '#141414',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        borderBright: 'rgba(255, 255, 255, 0.16)',
        accentGold: '#E4E4E7',
        accentEmerald: '#4ADE80',
        statusAvailable: '#4ADE80',
        statusReserved: '#E4E4E7',
        statusOccupied: '#F87171',
        statusMaintenance: '#5C5C60'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}

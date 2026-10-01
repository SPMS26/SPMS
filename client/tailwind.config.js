/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#0B0709',
        bgSidebar: '#0D0B0C',
        bgCard: '#0D0B0C',
        bgCardHover: '#171315',
        bgInput: '#1A1618',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        borderBright: 'rgba(255, 255, 255, 0.16)',
        accentGold: '#C28DB0',
        accentEmerald: '#4ADE80',
        statusAvailable: '#4ADE80',
        statusReserved: '#C28DB0',
        statusOccupied: '#F87171',
        statusMaintenance: '#8A7F86'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#050506',
        bgSidebar: '#111114',
        bgCard: '#111114',
        bgCardHover: '#17171B',
        bgInput: '#15151A',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        borderBright: 'rgba(255, 255, 255, 0.16)',
        accentGold: '#D9BF8C',
        accentEmerald: '#4ADE80',
        statusAvailable: '#4ADE80',
        statusReserved: '#D9BF8C',
        statusOccupied: '#F87171',
        statusMaintenance: '#4F4B43'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}

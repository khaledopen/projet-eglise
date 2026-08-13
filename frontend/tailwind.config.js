/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bleu-pale': '#93c5fd', // Light blue for buttons and titles
        'bleu-primary': '#3b82f6',
        'rouge-profond': '#991b1b', // Deep red for alerts and main actions
        'rouge-primary': '#dc2626',
        'blanc-casse': '#fafaf9', // Off-white for content areas
      },
    },
  },
  plugins: [],
}

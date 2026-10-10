/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#55175E',
          'purple-dark': '#421047',
          'purple-light': '#EDE3FA',
          'purple-tint': '#FAF7FD',
          lavender: '#FBF9FE',
          navy: '#17233B',
          muted: '#64748B',
          border: '#E5EAF0'
        },
        medical: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#55175E',
          700: '#0f766e',
          900: '#115e59'
        }
      }
    },
  },
  plugins: [],
}

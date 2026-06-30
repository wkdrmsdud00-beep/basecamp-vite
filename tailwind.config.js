/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Pretendard', 'Inter', 'sans-serif'] },
      colors: {
        primary: { 50: '#fefce8', 100: '#fef9c3', 400: '#eab308', 500: '#D9C54B', 600: '#ca8a04', 900: '#713f12' },
        slate: { 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#404040', 700: '#262626', 800: '#111111', 900: '#000000' },
      },
    },
  },
  plugins: [],
};

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
        blue: {
          DEFAULT: '#3b82f6',
        },
        emerald: {
          DEFAULT: '#10b981',
        },
        rose: {
          DEFAULT: '#f43f5e',
        },
      },
      animation: {
        'pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  safelist: [
    // Theme classes
    'theme-light',
    'theme-dark', 
    'theme-blue',
    'theme-emerald',
    'theme-rose',
    // Theme-specific background gradients
    'theme-blue:from-blue-50',
    'theme-blue:via-blue-100',
    'theme-blue:to-indigo-100',
    'theme-blue:dark:from-blue-900',
    'theme-blue:dark:via-blue-800',
    'theme-blue:dark:to-indigo-900',
    'theme-emerald:from-emerald-50',
    'theme-emerald:via-green-50',
    'theme-emerald:to-teal-50',
    'theme-emerald:dark:from-emerald-900',
    'theme-emerald:dark:via-green-900',
    'theme-emerald:dark:to-teal-900',
    'theme-rose:from-rose-50',
    'theme-rose:via-pink-50',
    'theme-rose:to-red-50',
    'theme-rose:dark:from-rose-900',
    'theme-rose:dark:via-pink-900',
    'theme-rose:dark:to-red-900',
    // Theme-specific orb colors
    'theme-blue:from-blue-500/30',
    'theme-blue:to-indigo-500/30',
    'theme-emerald:from-emerald-400/20',
    'theme-emerald:to-teal-400/20',
    'theme-rose:from-rose-400/20',
    'theme-rose:to-pink-400/20',
    // Theme-specific logo gradients
    'theme-blue:from-blue-600',
    'theme-blue:to-indigo-700',
    'theme-emerald:from-emerald-500',
    'theme-emerald:to-teal-600',
    'theme-rose:from-rose-500',
    'theme-rose:to-pink-600',
    // Theme-specific text gradients
    'theme-blue:from-blue-900',
    'theme-blue:to-blue-600',
    'theme-blue:dark:from-blue-100',
    'theme-blue:dark:to-blue-300',
    'theme-emerald:from-emerald-900',
    'theme-emerald:to-emerald-600',
    'theme-emerald:dark:from-emerald-100',
    'theme-emerald:dark:to-emerald-300',
    'theme-rose:from-rose-900',
    'theme-rose:to-rose-600',
    'theme-rose:dark:from-rose-100',
    'theme-rose:dark:to-rose-300',
  ],
};
// Theme classes: theme-light, theme-dark, theme-blue, theme-emerald, theme-rose 
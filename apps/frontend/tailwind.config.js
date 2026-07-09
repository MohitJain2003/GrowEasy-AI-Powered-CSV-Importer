/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    require('path').join(__dirname, "./app/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, '/'),
    require('path').join(__dirname, "./components/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, '/'),
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-color)',
        foreground: 'var(--fg-color)',
        border: 'var(--border-color)',
        primary: {
          DEFAULT: 'rgb(99, 102, 241)', // Indigo
          hover: 'rgb(79, 70, 229)',
        },
        success: {
          DEFAULT: 'rgb(16, 185, 129)', // Emerald
          bg: 'rgba(16, 185, 129, 0.1)',
        },
        error: {
          DEFAULT: 'rgb(239, 68, 68)', // Red
          bg: 'rgba(239, 68, 68, 0.1)',
        },
        warning: {
          DEFAULT: 'rgb(245, 158, 11)', // Amber
          bg: 'rgba(245, 158, 11, 0.1)',
        },
        card: {
          DEFAULT: 'var(--card-bg)',
          border: 'var(--card-border)',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

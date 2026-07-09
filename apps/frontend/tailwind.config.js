/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    require('path').join(__dirname, "./app/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, '/'),
    require('path').join(__dirname, "./components/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, '/'),
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(9, 9, 11)', // dark zinc
        foreground: 'rgb(250, 250, 250)',
        border: 'rgba(63, 63, 70, 0.4)', // semi-transparent zinc-700
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
          DEFAULT: 'rgba(24, 24, 27, 0.6)', // Glassmorphism dark zinc
          border: 'rgba(63, 63, 70, 0.3)',
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

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        salon: {
          50: '#fff5f7',
          100: '#ffeef2',
          200: '#ffd8e2',
          300: '#ffb3c5',
          400: '#ff7e9e',
          500: '#f84e79',
          600: '#e62e60',
          700: '#c21d49',
          800: '#a21b40',
          900: '#871b3a',
          950: '#4c0a1d',
        },
        champagne: {
          50: '#fbf9f4',
          100: '#f5f0e3',
          200: '#ebdfc4',
          300: '#ddc79e',
          400: '#cca973',
          500: '#be8f53',
          600: '#ab7645',
          700: '#8e5c3a',
          800: '#744a33',
          900: '#5f3e2d',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;

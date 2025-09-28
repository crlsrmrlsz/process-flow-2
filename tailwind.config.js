/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light'],
    base: true,
    styled: true,
    utils: true,
  },
  safelist: [
    'checkbox',
    'checkbox-sm',
    'checkbox-primary',
    'btn',
    'btn-ghost',
    'btn-square',
    'btn-sm'
  ]
}
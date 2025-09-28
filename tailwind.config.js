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
    // DaisyUI Components
    'checkbox',
    'checkbox-sm',
    'checkbox-primary',
    'btn',
    'btn-ghost',
    'btn-square',
    'btn-sm',
    'btn-primary',
    'btn-secondary',
    'btn-accent',
    'btn-outline',
    'card',
    'card-bordered',
    'card-body',
    'card-title',
    'badge',
    'badge-primary',
    'badge-sm',
    'drawer',
    'drawer-toggle',
    'drawer-content',
    'drawer-side',
    'drawer-overlay',
    // Custom Utilities
    'text-[11px]'
  ]
}
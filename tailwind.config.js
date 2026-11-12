/**
 * Tailwind v4 note: this project uses `@import "tailwindcss"`, which does NOT read this file
 * unless you add `@config "../tailwind.config.js";` to globals.css.
 * All brand colors now live in app/globals.css inside @theme (bg-bull-*, text-bull-*, etc.),
 * so this file is intentionally minimal.
 */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};

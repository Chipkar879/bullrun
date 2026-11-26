export const FONT_KEY = 'bullrun_font_v1';

export const FONTS = [
  { id: 'default', name: 'Site default', stack: null, q: null },
  { id: 'inter', name: 'Inter', stack: "'Inter', sans-serif", q: 'Inter:wght@400;500;600;700;800' },
  { id: 'jakarta', name: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', sans-serif", q: 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  { id: 'grotesk', name: 'Space Grotesk', stack: "'Space Grotesk', sans-serif", q: 'Space+Grotesk:wght@400;500;600;700' },
  { id: 'lora', name: 'Lora', stack: "'Lora', serif", q: 'Lora:wght@400;500;600;700' },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', stack: "'Atkinson Hyperlegible', sans-serif", q: 'Atkinson+Hyperlegible:wght@400;700' },
  { id: 'jetbrains', name: 'JetBrains Mono', stack: "'JetBrains Mono', monospace", q: 'JetBrains+Mono:wght@400;500;700' },
];

const gfUrl = (families) => 'https://fonts.googleapis.com/css2?' + families.map((q) => 'family=' + q).join('&') + '&display=swap';

function addLink(id, href) {
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.id = id;
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

export function loadFont() {
  try {
    const id = localStorage.getItem(FONT_KEY);
    return FONTS.some((f) => f.id === id) ? id : 'default';
  } catch {
    return 'default';
  }
}

export function saveFont(id) {
  try {
    if (id === 'default') localStorage.removeItem(FONT_KEY);
    else localStorage.setItem(FONT_KEY, id);
  } catch {}
}

// Loads every font once so the "Aa" previews render in their own typeface
export function loadPreviewFonts() {
  addLink('bullrun-font-preview', gfUrl(FONTS.filter((f) => f.q).map((f) => f.q)));
}

export function applyFont(id) {
  const old = document.getElementById('bullrun-font-style');
  if (old) old.remove();
  const f = FONTS.find((x) => x.id === id);
  if (!f || !f.stack) return;
  addLink('bullrun-font-link-' + f.id, gfUrl([f.q]));
  const s = document.createElement('style');
  s.id = 'bullrun-font-style';
  // Elements with the font-mono class are skipped, so prices and numbers stay aligned
  s.textContent =
    ':root{--font-sans:' + f.stack + '}' +
    ':is(body,.font-sans,h1,h2,h3,h4,h5,h6,button,input,select,textarea):not(.font-mono){font-family:' + f.stack + ' !important}';
  document.head.appendChild(s);
}

// Bull Run theme engine: dark / light mode plus accent, gains and losses colors.
// This file exports ONE string of plain browser JavaScript. layout.js inlines it in <head>,
// so the saved mode and colors are applied before the first paint (no flash). The customizer
// dialog talks to it through window.BullRunTheme. Do not use backticks or dollar-brace in here.
export const THEME_ENGINE_SOURCE = String.raw`
(function () {
  try {
    var KEY = 'bullrun_theme_v1';
    var EVENT_NAME = 'bullrun-theme-change';
    var DEFAULTS = { mode: 'dark', accent: '#B7F34A', gain: '#19C6B4', loss: '#FF765E' };
    var NAVY = '#0A1226';
    var DARK_BG = '#0A1226';
    var LIGHT = { bg: '#E9EFFA', surface: '#FFFFFF', raised: '#E4ECF8', line: '#C5D2E8', text: '#0A1226', text2: '#26324D', muted: '#56637E' };
    var TEXT_MIN = 4.6;

    var PRESETS = [
      { id: 'bullrun', name: 'Bull Run', colors: { accent: '#B7F34A', gain: '#19C6B4', loss: '#FF765E' } },
      { id: 'arcade',  name: 'Neon Arcade', colors: { accent: '#B28DFF', gain: '#3DF2C0', loss: '#FF5C8A' } },
      { id: 'ocean',   name: 'Ocean', colors: { accent: '#38BDF8', gain: '#34D399', loss: '#FB7185' } },
      { id: 'sunset',  name: 'Sunset', colors: { accent: '#FFB347', gain: '#7BE0AD', loss: '#FF6B6B' } },
      { id: 'mono',    name: 'Mono', colors: { accent: '#9CA3AF', gain: '#86EFAC', loss: '#FCA5A5' } }
    ];

    // The site was written for a dark page: light text on dark cards. In light mode these Tailwind
    // scales are swapped so the same classes (text-white, text-slate-400, bg-amber-950 ...) stay readable.
    var LIGHT_SLATE = { '50': '#020617', '100': '#0F172A', '200': '#1E293B', '300': '#334155', '400': '#475569', '500': '#566479', '600': '#94A3B8', '700': '#CBD5E1', '800': '#E2E8F0', '900': '#F1F5F9', '950': '#F8FAFC' };
    var LIGHT_AMBER = { '50': '#451A03', '100': '#451A03', '200': '#78350F', '300': '#92400E', '400': '#A84A08', '500': '#D97706', '600': '#F59E0B', '700': '#FBBF24', '800': '#FDE68A', '900': '#FEF3C7', '950': '#FFFBEB' };

    var DARK_LIGHT_STEPS = [['100', 0.82], ['200', 0.62], ['300', 0.37]];
    var DARK_DARK_STEPS = [['500', 0.17], ['600', 0.34], ['700', 0.48], ['800', 0.60], ['900', 0.70], ['950', 0.84]];

    function norm(h) {
      if (typeof h !== 'string') return null;
      var s = h.trim();
      if (s.charAt(0) !== '#') s = '#' + s;
      if (s.length === 4) s = '#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3);
      return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null;
    }
    function toRgb(h) {
      return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }
    function toHex(c) {
      var out = '#';
      for (var i = 0; i < 3; i++) {
        var n = Math.max(0, Math.min(255, Math.round(c[i])));
        out += (n < 16 ? '0' : '') + n.toString(16);
      }
      return out.toUpperCase();
    }
    function mix(a, b, t) {
      var x = toRgb(a), y = toRgb(b);
      return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
    }
    function lum(h) {
      var c = toRgb(h).map(function (v) {
        v = v / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function contrast(a, b) {
      var x = lum(a), y = lum(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }
    function dist(a, b) {
      var x = toRgb(a), y = toRgb(b);
      return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2));
    }
    // Darkens a color step by step until it is readable as text on the given background.
    function darkenTo(hex, target, bg) {
      for (var t = 0; t <= 0.9; t += 0.02) {
        var c = mix(hex, '#000000', t);
        if (contrast(c, bg) >= target) return c;
      }
      return mix(hex, '#000000', 0.9);
    }

    // Dark mode: light tints for text, dark shades for backgrounds and borders.
    function darkScale(vars, prefix, base) {
      DARK_LIGHT_STEPS.forEach(function (s) { vars['--color-' + prefix + '-' + s[0]] = mix(base, '#FFFFFF', s[1]); });
      vars['--color-' + prefix + '-400'] = base;
      DARK_DARK_STEPS.forEach(function (s) { vars['--color-' + prefix + '-' + s[0]] = mix(base, '#000000', s[1]); });
    }
    // Light mode: deep shades for text, bright base for fills, pale tints for backgrounds.
    function lightScale(vars, prefix, base) {
      var t = darkenTo(base, TEXT_MIN, LIGHT.raised);
      vars['--color-' + prefix + '-100'] = mix(t, '#000000', 0.6);
      vars['--color-' + prefix + '-200'] = mix(t, '#000000', 0.4);
      vars['--color-' + prefix + '-300'] = mix(t, '#000000', 0.2);
      vars['--color-' + prefix + '-400'] = t;
      vars['--color-' + prefix + '-500'] = mix(base, '#000000', 0.12);
      vars['--color-' + prefix + '-600'] = base;
      vars['--color-' + prefix + '-700'] = mix(base, '#FFFFFF', 0.15);
      vars['--color-' + prefix + '-800'] = mix(base, '#FFFFFF', 0.55);
      vars['--color-' + prefix + '-900'] = mix(base, '#FFFFFF', 0.75);
      vars['--color-' + prefix + '-950'] = mix(base, '#FFFFFF', 0.88);
    }

    function normalize(p) {
      p = p || {};
      return {
        mode: p.mode === 'light' ? 'light' : 'dark',
        accent: norm(p.accent) || DEFAULTS.accent,
        gain: norm(p.gain) || DEFAULTS.gain,
        loss: norm(p.loss) || DEFAULTS.loss
      };
    }

    // Turns the user's choices into CSS variables. Dark mode with default colors produces none,
    // so an untouched site keeps the exact brand CSS from globals.css.
    function compute(prefs) {
      var p = normalize(prefs), warnings = [], clean = { mode: p.mode };
      var light = p.mode === 'light';
      var names = { accent: 'Accent', gain: 'Gains', loss: 'Losses' };

      ['accent', 'gain', 'loss'].forEach(function (k) {
        var c = p[k];
        if (light) {
          if (contrast(c, '#FFFFFF') < 1.25) {
            warnings.push({ role: k, level: 'error', msg: names[k] + ' color is too light to see in light mode, so it was not applied.' });
            c = DEFAULTS[k];
          }
        } else {
          var r = contrast(c, DARK_BG);
          if (r < 3) {
            warnings.push({ role: k, level: 'error', msg: names[k] + ' color is too dark to see in dark mode, so it was not applied.' });
            c = DEFAULTS[k];
          } else if (r < 4.5) {
            warnings.push({ role: k, level: 'warn', msg: names[k] + ' color may be hard to read as text in dark mode.' });
          }
        }
        clean[k] = c;
      });
      if (dist(clean.gain, clean.loss) < 90) {
        warnings.push({ role: 'loss', level: 'warn', msg: 'Gains and losses look very similar. Traders need to tell them apart at a glance.' });
      }

      var vars = {};
      if (light) {
        vars['--color-bull-bg'] = LIGHT.bg; vars['--bg-main'] = LIGHT.bg;
        vars['--color-bull-surface'] = LIGHT.surface; vars['--bg-surface'] = LIGHT.surface;
        vars['--color-bull-raised'] = LIGHT.raised; vars['--bg-surface-elevated'] = LIGHT.raised;
        vars['--color-bull-line'] = LIGHT.line; vars['--border-color'] = LIGHT.line;
        vars['--text-primary'] = LIGHT.text; vars['--color-bull-text'] = LIGHT.text;
        vars['--text-secondary'] = LIGHT.text2; vars['--color-bull-text-2'] = LIGHT.text2;
        vars['--text-muted'] = LIGHT.muted; vars['--color-bull-muted'] = LIGHT.muted;
        vars['--color-white'] = LIGHT.text;
        Object.keys(LIGHT_SLATE).forEach(function (n) { vars['--color-slate-' + n] = LIGHT_SLATE[n]; });
        Object.keys(LIGHT_AMBER).forEach(function (n) { vars['--color-amber-' + n] = LIGHT_AMBER[n]; });
        vars['--accent-text'] = clean.accent === DEFAULTS.accent ? '#2F6B05' : darkenTo(clean.accent, TEXT_MIN, LIGHT.raised);
        lightScale(vars, 'emerald', clean.gain);
        lightScale(vars, 'rose', clean.loss);
      }
      if (clean.accent !== DEFAULTS.accent) {
        var a = clean.accent;
        var lighter = mix(a, '#FFFFFF', 0.25), darker = mix(a, '#000000', 0.30);
        vars['--color-bull-lime'] = a; vars['--color-lime'] = a; vars['--border-color-active'] = a;
        vars['--color-bull-lime-light'] = lighter; vars['--color-lime-hover'] = lighter;
        vars['--color-bull-lime-dark'] = darker;
        vars['--color-bull-ink'] = contrast(a, NAVY) >= contrast(a, '#FFFFFF') ? NAVY : '#FFFFFF';
      }
      if (clean.gain !== DEFAULTS.gain) {
        vars['--color-bull-teal'] = clean.gain; vars['--color-teal'] = clean.gain; vars['--color-gain'] = clean.gain;
        if (!light) darkScale(vars, 'emerald', clean.gain);
      }
      if (clean.loss !== DEFAULTS.loss) {
        vars['--color-bull-coral'] = clean.loss; vars['--color-coral'] = clean.loss; vars['--color-loss'] = clean.loss;
        if (!light) darkScale(vars, 'rose', clean.loss);
      }
      return { vars: vars, warnings: warnings, clean: clean };
    }

    // Every variable this engine can ever set, so apply() can clear them all before setting new ones.
    var ALL_VARS = (function () {
      var seen = {};
      [
        { mode: 'dark', accent: '#FFFFFF', gain: '#FFD700', loss: '#FF4444' },
        { mode: 'light', accent: '#222222', gain: '#116611', loss: '#AA2222' }
      ].forEach(function (probe) {
        Object.keys(compute(probe).vars).forEach(function (n) { seen[n] = true; });
      });
      return Object.keys(seen);
    })();

    function setMeta(color) {
      try {
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', color);
      } catch (e) {}
    }

    function apply(prefs) {
      var res = compute(prefs);
      var root = document.documentElement;
      var st = root.style;
      ALL_VARS.forEach(function (n) { st.removeProperty(n); });
      Object.keys(res.vars).forEach(function (n) { st.setProperty(n, res.vars[n]); });
      root.setAttribute('data-mode', res.clean.mode);
      st.colorScheme = res.clean.mode;
      setMeta(res.vars['--bg-main'] || DARK_BG);
      return res;
    }
    function isDefault(p) {
      return p.mode === DEFAULTS.mode && p.accent === DEFAULTS.accent && p.gain === DEFAULTS.gain && p.loss === DEFAULTS.loss;
    }
    function load() {
      try {
        var raw = window.localStorage.getItem(KEY);
        var obj = raw ? JSON.parse(raw) : null;
        return obj && typeof obj === 'object' ? normalize(obj) : null;
      } catch (e) { return null; }
    }
    function save(prefs) {
      var p = normalize(prefs);
      try {
        if (isDefault(p)) window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, JSON.stringify(p));
      } catch (e) {}
      try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: p })); } catch (e) {}
      return p;
    }
    function reset() {
      save(DEFAULTS);
      return apply(DEFAULTS);
    }

    window.BullRunTheme = {
      KEY: KEY, EVENT: EVENT_NAME, DEFAULTS: DEFAULTS, PRESETS: PRESETS,
      norm: norm, contrast: contrast, normalize: normalize, compute: compute,
      apply: apply, load: load, save: save, reset: reset
    };

    var saved = load();
    if (saved) apply(saved);
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) apply(load() || DEFAULTS);
    });
    document.addEventListener('DOMContentLoaded', function () {
      setMeta((load() ? compute(load()).vars['--bg-main'] : null) || DARK_BG);
    });
  } catch (err) {}
})();
`;
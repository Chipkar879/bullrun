// Bull Run theme engine.
// This file exports ONE string of plain browser JavaScript. layout.js inlines it in <head>,
// so saved colors are applied before the first paint (no flash). The customizer dialog
// talks to it through window.BullRunTheme. Do not use backticks or dollar-brace in here.
export const THEME_ENGINE_SOURCE = String.raw`
(function () {
  try {
    var KEY = 'bullrun_theme_v1';
    var DEFAULTS = { accent: '#B7F34A', gain: '#19C6B4', loss: '#FF765E', bg: '#0A1226' };
    var TEXT = '#F5F7FA';

    var PRESETS = [
      { id: 'bullrun', name: 'Bull Run', colors: { accent: '#B7F34A', gain: '#19C6B4', loss: '#FF765E', bg: '#0A1226' } },
      { id: 'arcade',  name: 'Neon Arcade', colors: { accent: '#B28DFF', gain: '#3DF2C0', loss: '#FF5C8A', bg: '#140A2E' } },
      { id: 'ocean',   name: 'Ocean', colors: { accent: '#38BDF8', gain: '#34D399', loss: '#FB7185', bg: '#061A2B' } },
      { id: 'sunset',  name: 'Sunset', colors: { accent: '#FFB347', gain: '#7BE0AD', loss: '#FF6B6B', bg: '#1A0E1F' } },
      { id: 'mono',    name: 'Midnight Mono', colors: { accent: '#E5E7EB', gain: '#86EFAC', loss: '#FCA5A5', bg: '#0B0B0F' } }
    ];

    var LIGHT_STEPS = [['100', 0.82], ['200', 0.62], ['300', 0.37]];
    var DARK_STEPS = [['500', 0.17], ['600', 0.34], ['700', 0.48], ['800', 0.60], ['900', 0.70], ['950', 0.84]];

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
    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h = 0, s = 0, l = (max + min) / 2, d = max - min;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [h, s, l];
    }
    function hslToRgb(h, s, l) {
      if (s === 0) { var v = l * 255; return [v, v, v]; }
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      function f(t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
      return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
    }
    function lift(hex, dl) {
      var c = toRgb(hex), hsl = rgbToHsl(c[0], c[1], c[2]);
      return toHex(hslToRgb(hsl[0], hsl[1] * (1 - dl * 1.4), Math.min(1, hsl[2] + dl)));
    }
    function addScale(vars, prefix, base) {
      LIGHT_STEPS.forEach(function (s) { vars['--color-' + prefix + '-' + s[0]] = mix(base, '#FFFFFF', s[1]); });
      vars['--color-' + prefix + '-400'] = base;
      DARK_STEPS.forEach(function (s) { vars['--color-' + prefix + '-' + s[0]] = mix(base, '#000000', s[1]); });
    }

    // Turns the user's choices into CSS variables. Only roles that differ from the defaults
    // produce variables, so an untouched role keeps the exact brand CSS.
    function compute(prefs) {
      var p = prefs || {}, warnings = [], clean = {};
      var bg = norm(p.bg) || DEFAULTS.bg;
      if (contrast(bg, TEXT) < 7) {
        warnings.push({ role: 'bg', level: 'error', msg: 'That background is too light for the white text, so it was not applied.' });
        bg = DEFAULTS.bg;
      }
      clean.bg = bg;
      var names = { accent: 'Accent', gain: 'Gains', loss: 'Losses' };
      ['accent', 'gain', 'loss'].forEach(function (k) {
        var c = norm(p[k]) || DEFAULTS[k];
        var r = contrast(c, bg);
        if (r < 3) {
          warnings.push({ role: k, level: 'error', msg: names[k] + ' color is too dark to see on this background, so it was not applied.' });
          c = DEFAULTS[k];
        } else if (r < 4.5) {
          warnings.push({ role: k, level: 'warn', msg: names[k] + ' color may be hard to read as text on this background.' });
        }
        clean[k] = c;
      });
      if (dist(clean.gain, clean.loss) < 90) {
        warnings.push({ role: 'loss', level: 'warn', msg: 'Gains and losses look very similar. Traders need to tell them apart at a glance.' });
      }

      var vars = {};
      if (clean.bg !== DEFAULTS.bg) {
        var s1 = lift(clean.bg, 0.04), s2 = lift(clean.bg, 0.10), s3 = lift(clean.bg, 0.17);
        vars['--color-bull-bg'] = clean.bg; vars['--bg-main'] = clean.bg;
        vars['--color-bull-surface'] = s1; vars['--bg-surface'] = s1;
        vars['--color-bull-raised'] = s2; vars['--bg-surface-elevated'] = s2;
        vars['--color-bull-line'] = s3; vars['--border-color'] = s3;
      }
      if (clean.accent !== DEFAULTS.accent) {
        var a = clean.accent;
        var light = mix(a, '#FFFFFF', 0.25), dark = mix(a, '#000000', 0.30);
        vars['--color-bull-lime'] = a; vars['--color-lime'] = a; vars['--border-color-active'] = a;
        vars['--color-bull-lime-light'] = light; vars['--color-lime-hover'] = light;
        vars['--color-bull-lime-dark'] = dark;
        vars['--color-bull-ink'] = contrast(a, '#0A1226') >= contrast(a, '#FFFFFF') ? '#0A1226' : '#FFFFFF';
      }
      if (clean.gain !== DEFAULTS.gain) {
        vars['--color-bull-teal'] = clean.gain; vars['--color-teal'] = clean.gain; vars['--color-gain'] = clean.gain;
        addScale(vars, 'emerald', clean.gain);
      }
      if (clean.loss !== DEFAULTS.loss) {
        vars['--color-bull-coral'] = clean.loss; vars['--color-coral'] = clean.loss; vars['--color-loss'] = clean.loss;
        addScale(vars, 'rose', clean.loss);
      }
      return { vars: vars, warnings: warnings, clean: clean };
    }

    var ALL_VARS = Object.keys(compute({ accent: '#FFFFFF', gain: '#FFD700', loss: '#FF0000', bg: '#000000' }).vars);

    function apply(prefs) {
      var res = compute(prefs);
      var st = document.documentElement.style;
      ALL_VARS.forEach(function (n) { st.removeProperty(n); });
      Object.keys(res.vars).forEach(function (n) { st.setProperty(n, res.vars[n]); });
      return res;
    }
    function isDefault(c) {
      return c.accent === DEFAULTS.accent && c.gain === DEFAULTS.gain && c.loss === DEFAULTS.loss && c.bg === DEFAULTS.bg;
    }
    function load() {
      try {
        var raw = window.localStorage.getItem(KEY);
        var obj = raw ? JSON.parse(raw) : null;
        return obj && typeof obj === 'object' ? obj : null;
      } catch (e) { return null; }
    }
    function save(clean) {
      try {
        if (isDefault(clean)) window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, JSON.stringify(clean));
      } catch (e) {}
    }
    function reset() {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      return apply(DEFAULTS);
    }

    window.BullRunTheme = {
      KEY: KEY, DEFAULTS: DEFAULTS, PRESETS: PRESETS,
      norm: norm, contrast: contrast, compute: compute,
      apply: apply, load: load, save: save, reset: reset
    };

    var saved = load();
    if (saved) apply(saved);
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) apply(load() || DEFAULTS);
    });
  } catch (err) {}
})();
`;
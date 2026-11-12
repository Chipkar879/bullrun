'use client';

import { useState, useEffect, useRef } from 'react';

const ROLES = [
  { key: 'accent', label: 'Accent', hint: 'Buttons, active tabs, XP and rewards' },
  { key: 'gain', label: 'Gains', hint: 'Profits, progress bars, quiz' },
  { key: 'loss', label: 'Losses', hint: 'Losses, alerts, NEW tags' },
];

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7" r="1" />
      <circle cx="15.5" cy="7.5" r="1" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export default function ThemeCustomizer() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const t = typeof window !== 'undefined' ? window.BullRunTheme : null;

  // Load the saved choice once the page is on screen
  useEffect(() => {
    const engine = window.BullRunTheme;
    if (!engine) return undefined;
    const current = engine.load() || engine.DEFAULTS;
    setPrefs(current);
    setWarnings(engine.compute(current).warnings);
    setReady(true);

    const onStorage = (e) => {
      if (e.key !== engine.KEY) return;
      const next = engine.load() || engine.DEFAULTS;
      setPrefs(next);
      setWarnings(engine.compute(next).warnings);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Escape closes the dialog and returns focus to the button
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        if (buttonRef.current) buttonRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    if (panelRef.current) panelRef.current.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!ready || !t || !prefs) return null;

  const commit = (next, keepDrafts) => {
    const saved = t.save(next);
    const res = t.apply(saved);
    setPrefs(saved);
    setWarnings(res.warnings);
    if (!keepDrafts) setDrafts({});
  };

  const isLight = prefs.mode === 'light';
  const changeMode = (mode) => commit({ ...prefs, mode }, false);
  const toggleMode = () => changeMode(isLight ? 'dark' : 'light');
  const changeColor = (key, value) => commit({ ...prefs, [key]: value }, false);

  const changeText = (key, raw) => {
    setDrafts((d) => ({ ...d, [key]: raw }));
    const digits = raw.replace('#', '');
    const valid = digits.length === 6 ? t.norm(raw) : null;
    if (valid) commit({ ...prefs, [key]: valid }, true);
  };

  // Resets the three colors but keeps the chosen mode
  const resetColors = () => commit({ ...t.DEFAULTS, mode: prefs.mode }, false);

  const isActivePreset = (p) => ROLES.every((r) => prefs[r.key] === p.colors[r.key]);

  return (
    <>
      <button
        type="button"
        onClick={toggleMode}
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        className="fixed bottom-4 right-[4.5rem] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-bull-line bg-bull-surface text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        {isLight ? <MoonIcon /> : <SunIcon />}
      </button>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Customize colors"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-bull-lime text-bull-ink shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <PaletteIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Customize colors"
          tabIndex={-1}
          className="fixed bottom-20 right-4 z-[60] max-h-[80vh] w-[min(92vw,22rem)] space-y-5 overflow-y-auto rounded-3xl border border-bull-line bg-bull-surface p-5 shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Make it yours</h2>
              <p className="text-xs text-bull-muted">Pick a mode and where each color goes. Saved on this device.</p>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); if (buttonRef.current) buttonRef.current.focus(); }}
              aria-label="Close"
              className="rounded-lg px-2 py-1 text-sm font-bold text-bull-muted hover:text-white cursor-pointer"
            >
              {'\u2715'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-bull-line bg-bull-bg p-1" role="group" aria-label="Color mode">
            {['dark', 'light'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                aria-pressed={prefs.mode === m}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-colors cursor-pointer ${prefs.mode === m ? 'bg-bull-lime text-bull-ink' : 'text-bull-muted hover:text-white'}`}
              >
                {m === 'dark' ? <MoonIcon /> : <SunIcon />}
                {m === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-bull-muted">Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {t.PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => commit({ ...p.colors, mode: prefs.mode }, false)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold text-white transition-colors cursor-pointer ${isActivePreset(p) ? 'border-bull-lime bg-bull-raised' : 'border-bull-line bg-bull-bg hover:border-bull-lime/50'}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="flex shrink-0 -space-x-1">
                    {['accent', 'gain', 'loss'].map((k) => (
                      <span key={k} className="h-4 w-4 rounded-full border border-white/20" style={{ background: p.colors[k] }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => (
              <div key={role.key} className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={`${role.label} color`}
                  value={prefs[role.key].toLowerCase()}
                  onChange={(e) => changeColor(role.key, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-bull-line bg-transparent p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{role.label}</p>
                  <p className="text-xs leading-snug text-bull-muted">{role.hint}</p>
                </div>
                <input
                  type="text"
                  aria-label={`${role.label} hex code`}
                  value={drafts[role.key] !== undefined ? drafts[role.key] : prefs[role.key]}
                  onChange={(e) => changeText(role.key, e.target.value)}
                  onBlur={() => setDrafts({})}
                  maxLength={7}
                  spellCheck={false}
                  className="w-[5.5rem] rounded-lg border border-bull-line bg-bull-bg px-2 py-1.5 font-mono text-xs uppercase text-white outline-none focus:border-bull-lime"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-bull-line bg-bull-bg p-3">
            <p className="text-xs font-bold text-bull-muted">Preview</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-bull-lime px-3 py-1.5 text-xs font-black text-bull-ink">Start trading</span>
              <span className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 text-xs font-bold text-emerald-400">{'\u25B2 +2.4%'}</span>
              <span className="rounded-lg border border-rose-500/40 bg-rose-950/60 px-2 py-1 text-xs font-bold text-rose-400">{'\u25BC \u22121.1%'}</span>
            </div>
          </div>

          {warnings.length > 0 && (
            <ul className="space-y-1" aria-live="polite">
              {warnings.map((w, i) => (
                <li key={i} className={`text-xs ${w.level === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {w.msg}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={resetColors}
            className="w-full rounded-xl border border-bull-line bg-bull-raised py-2.5 text-sm font-bold text-white transition-colors hover:border-bull-lime cursor-pointer"
          >
            Reset to Bull Run colors
          </button>
        </div>
      )}
    </>
  );
}
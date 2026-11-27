'use client';

import React, { useState } from 'react';

// Images live in public/mascot/bulzo-<mood>.png
// Shown bare by default. Pass framed={true} for a sticker frame.
export default function Mascot({ mood = 'hello', size = 96, fallback = '\ud83d\udc02', className = '', framed = false }) {
  const [failedMood, setFailedMood] = useState(null);
  const failed = failedMood === mood;

  const inner = failed ? (
    <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{fallback}</span>
  ) : (
    <img
      src={'/mascot/bulzo-' + mood + '.png'}
      alt="Bulzo"
      className="br-pop object-contain"
      style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))' }}
      onError={() => setFailedMood(mood)}
    />
  );

  const frame = framed
    ? ' overflow-hidden rounded-3xl bg-gradient-to-br from-lime-200 via-lime-100 to-amber-100 ring-2 ring-lime-400/70 shadow-lg'
    : '';

  return (
    <span
      className={'inline-flex items-center justify-center shrink-0' + frame + ' ' + className}
      style={{ width: size, height: size }}
    >
      {inner}
    </span>
  );
}

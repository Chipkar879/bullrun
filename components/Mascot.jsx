'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';

// Images live in public/mascot/
//   bulzo-<mood>.png      big, for laptops and tablets
//   bulzo-<mood>-sm.png   small, for phones (screens up to 640px wide)
// Shown bare by default. Pass framed={true} for a sticker frame.
export default function Mascot({ mood = 'hello', size = 96, fallback = '\ud83d\udc02', className = '', framed = false, eager = false }) {
  // level 0: phone + laptop images, level 1: laptop image only, level 2: emoji
  const [fail, setFail] = useState({ mood: null, level: 0 });
  const level = fail.mood === mood ? fail.level : 0;
  const base = '/mascot/bulzo-' + mood;

  const imgProps = {
    alt: 'Bulzo',
    className: 'br-pop object-contain',
    style: { width: '100%', height: '100%', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))' },
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    onError: () => setFail({ mood, level: level + 1 }),
  };

  let inner;
  if (level >= 2) {
    inner = <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{fallback}</span>;
  } else if (level === 1) {
    inner = <img key="big" src={base + '.png'} {...imgProps} />;
  } else {
    inner = (
      <picture style={{ display: 'block', width: '100%', height: '100%' }}>
        <source media="(max-width: 640px)" srcSet={base + '-sm.png'} />
        <img key="pic" src={base + '.png'} {...imgProps} />
      </picture>
    );
  }

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
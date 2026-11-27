'use client';

import React, { useState } from 'react';

// Images live in public/mascot/bulzo-<mood>.png
// If an image is missing, the emoji fallback is shown instead.
export default function Mascot({ mood = 'hello', size = 96, fallback = '\ud83d\udc02', className = '' }) {
  const [failedMood, setFailedMood] = useState(null);

  if (failedMood === mood) {
    return (
      <span
        className={'inline-flex items-center justify-center ' + className}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={'/mascot/bulzo-' + mood + '.png'}
      alt="Bulzo"
      width={size}
      height={size}
      className={'br-pop shrink-0 object-contain ' + className}
      style={{ width: size, height: size }}
      onError={() => setFailedMood(mood)}
    />
  );
}

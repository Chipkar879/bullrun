'use client';
import { useId } from 'react';

function star(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 === 0 ? R : r;
    pts.push((cx + Math.cos(a) * d).toFixed(1) + ',' + (cy + Math.sin(a) * d).toFixed(1));
  }
  return pts.join(' ');
}

// rank: an entry from RANKS. locked: show a greyed silhouette.
export default function RankBadge({ rank, size = 96, locked = false }) {
  const uid = useId().replace(/:/g, '');
  const [light, mid, dark] = locked ? ['#475569', '#334155', '#1e293b'] : rank.c;
  const outer = 'M50 4 L92 20 V62 C92 90 70 108 50 116 C30 108 8 90 8 62 V20 Z';
  const inner = 'M50 14 L83 27 V61 C83 83 66 98 50 105 C34 98 17 83 17 61 V27 Z';
  const y0 = 62 - (rank.chevrons - 1) * 7;
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      role="img"
      aria-label={rank.name + (locked ? ' (locked)' : '')}
      style={rank.star && !locked ? { filter: 'drop-shadow(0 0 8px rgba(255,225,77,.7))' } : undefined}
    >
      <defs>
        <linearGradient id={uid + 'o'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={uid + 'i'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} stopOpacity=".95" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
      </defs>
      <path d={outer} fill={'url(#' + uid + 'o)'} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
      <path d={inner} fill={'url(#' + uid + 'i)'} stroke={light} strokeOpacity=".5" strokeWidth="1.5" strokeLinejoin="round" />
      {rank.star ? (
        <polygon points={star(50, 62, 26, 11)} fill={'url(#' + uid + 'o)'} stroke={light} strokeWidth="1.5" strokeLinejoin="round" />
      ) : (
        Array.from({ length: rank.chevrons }).map((_, i) => {
          const y = y0 + i * 14;
          return (
            <polyline
              key={i}
              points={'34,' + y + ' 50,' + (y + 13) + ' 66,' + y}
              fill="none"
              stroke={'url(#' + uid + 'o)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })
      )}
      {rank.id === 'immortal' && !locked && (
        <>
          <path d="M50 4 L44 -2 M50 4 L56 -2" stroke={mid} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

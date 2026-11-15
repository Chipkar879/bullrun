import { renderOgImage } from '@/lib/og';

export const alt = 'Bull Run: stock market game for students in India';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOgImage();
}

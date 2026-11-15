import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

// The logo comes from app/icon.svg, so changing that one file changes the share image too.
function readLogoDataUri() {
  try {
    const svg = fs.readFileSync(path.join(process.cwd(), 'app', 'icon.svg'));
    return 'data:image/svg+xml;base64,' + svg.toString('base64');
  } catch (err) {
    return null;
  }
}

export function renderOgImage() {
  const logo = readLogoDataUri();

  const logoEl = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} width={170} height={170} alt="" />
  ) : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#0A1226', color: '#F5F7FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {logoEl}
          <div style={{ display: 'flex', gap: 28, fontSize: 130, fontWeight: 900 }}>
            <span>Bull</span>
            <span style={{ color: '#B7F34A' }}>Run</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 46, marginTop: 24, color: '#D3DBEA' }}>Stock market game for students</div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 44, color: '#19C6B4' }}>Paper trading, daily quizzes and school leaderboards</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
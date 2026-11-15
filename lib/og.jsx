import { ImageResponse } from 'next/og';

export function renderOgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#0A1226', color: '#F5F7FA' }}>
        <div style={{ display: 'flex', gap: 28, fontSize: 130, fontWeight: 900 }}>
          <span>Bull</span>
          <span style={{ color: '#B7F34A' }}>Run</span>
        </div>
        <div style={{ display: 'flex', fontSize: 46, marginTop: 24, color: '#D3DBEA' }}>Stock market game for students</div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 44, color: '#19C6B4' }}>Paper trading, daily quizzes and school leaderboards</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

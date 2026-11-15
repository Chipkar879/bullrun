import { ImageResponse } from 'next/og';

// Logo is embedded so it works on Vercel without reading files at runtime.
const LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCI+DQogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iMjgiIGZpbGw9IiMwQTEyMjYiLz4NCiAgPHBhdGggZD0iTTYwLjIgNTkuMCBMNjAuNSA1OS4wIEw2MC45IDU5LjAgTDYxLjIgNTkuMSBMNjEuNiA1OS4xIEw2MS45IDU5LjMgTDYyLjMgNTkuNSBMNjIuNiA1OS43IEw2Mi45IDU5LjkgTDYzLjIgNjAuMiBMNjMuNCA2MC42IEw2My42IDYwLjkgTDYzLjggNjEuMyBMNjMuOSA2MS43IEw2NC4wIDYyLjIgTDY0LjEgNjIuNiBMNjQuMSA2My4xIEw2NC4wIDYzLjUgTDYzLjkgNjQuMCBMNjMuNyA2NC41IEw2My41IDY0LjkgTDYzLjIgNjUuNCBMNjIuOSA2NS44IEw2Mi41IDY2LjIgTDYyLjEgNjYuNSBMNjEuNiA2Ni44IEw2MS4xIDY3LjEgTDYwLjUgNjcuMyBMNjAuMCA2Ny40IEw1OS40IDY3LjUgTDU4LjcgNjcuNSBMNTguMSA2Ny41IEw1Ny40IDY3LjMgTDU2LjggNjcuMSBMNTYuMiA2Ni44IEw1NS42IDY2LjUgTDU1LjAgNjYuMSBMNTQuNSA2NS42IEw1NC4wIDY1LjAgTDUzLjYgNjQuNCBMNTMuMiA2My43IEw1Mi45IDYzLjAgTDUyLjcgNjIuMiBMNTIuNiA2MS40IEw1Mi41IDYwLjUgTDUyLjYgNTkuNyBMNTIuNyA1OC44IEw1My4wIDU3LjkgTDUzLjMgNTcuMSBMNTMuOCA1Ni4zIEw1NC4zIDU1LjUgTDU1LjAgNTQuNyBMNTUuNyA1NC4xIEw1Ni41IDUzLjUgTDU3LjQgNTMuMCBMNTguNCA1Mi41IEw1OS41IDUyLjIgTDYwLjUgNTIuMCBMNjEuNyA1MS45IEw2Mi44IDUxLjkgTDY0LjAgNTIuMSBMNjUuMiA1Mi40IEw2Ni4zIDUyLjggTDY3LjQgNTMuNCBMNjguNSA1NC4xIEw2OS41IDU0LjkgTDcwLjUgNTUuOSBMNzEuMyA1Ny4wIEw3Mi4xIDU4LjIgTDcyLjcgNTkuNSBMNzMuMSA2MC45IEw3My41IDYyLjMgTDczLjYgNjMuOCBMNzMuNiA2NS40IEw3My41IDY3LjAgTDczLjEgNjguNSBMNzIuNiA3MC4xIEw3MS45IDcxLjYgTDcxLjAgNzMuMSBMNjkuOSA3NC41IEw2OC42IDc1LjggTDY3LjIgNzcuMCBMNjUuNiA3OC4wIEw2My45IDc4LjkgTDYyLjEgNzkuNiBMNjAuMiA4MC4xIEw1OC4xIDgwLjQgTDU2LjAgODAuNSBMNTMuOSA4MC4zIEw1MS44IDc5LjkgTDQ5LjYgNzkuMyBMNDcuNSA3OC40IEw0NS41IDc3LjIgTDQzLjYgNzUuOCBMNDEuOCA3NC4yIEw0MC4xIDcyLjMgTDM4LjcgNzAuMyBMMzcuNCA2OC4wIEwzNi40IDY1LjYgTDM1LjcgNjMuMCBMMzUuMiA2MC4zIEwzNS4wIDU3LjUgTDM1LjEgNTQuNiBMMzUuNiA1MS43IEwzNi40IDQ4LjggTDM3LjUgNDUuOSBMMzguOSA0My4yIEw0MC43IDQwLjUgTDQyLjggMzguMCBMNDUuMyAzNS43IEw0OC4wIDMzLjcgTDUxLjAgMzEuOSBMNTQuMiAzMC40IEw1Ny43IDI5LjMgTDYxLjMgMjguNiBMNjUuMSAyOC4yIEw2OC45IDI4LjIgTDcyLjggMjguNyBMNzYuOCAyOS43IEw4MC42IDMxLjAgTDg0LjQgMzIuOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjdGMzRBIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSI4NC40IiBjeT0iMzIuOSIgcj0iNyIgZmlsbD0iIzE5QzZCNCIvPg0KPC9zdmc+DQo=';

export function renderOgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#0A1226', color: '#F5F7FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} width={170} height={170} alt="" />
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
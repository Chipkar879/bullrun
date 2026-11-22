'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { ASSETS, ASSET_BY_SYM, CATEGORIES } from '@/lib/catalog';

const START_BALANCE = 50000;
const PRICE_REFRESH_MS = 15000;
const SAVE_DEBOUNCE_MS = 1000;

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function getIndiaClock(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

function isIndianMarketOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const weekday = part('weekday');
  const hour = Number(part('hour'));
  const minute = Number(part('minute'));
  const totalMinutes = hour * 60 + minute;

  return (
    !['Sat', 'Sun'].includes(weekday) &&
    totalMinutes >= 9 * 60 + 15 &&
    totalMinutes < 15 * 60 + 30
  );
}

function PriceChart({ history, symbol, session, markers }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const width = 760;
  const height = 300;
  const pad = { top: 22, right: 82, bottom: 30, left: 12 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const points = useMemo(
    () =>
      (history || [])
        .map((point, index) => ({
          value: Number(point.close ?? point.price),
          time: point.time ?? point.timestamp ?? point.date,
          index,
        }))
        .filter((point) => Number.isFinite(point.value)),
    [history]
  );

  const values = points.map((point) => point.value);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const rising = last >= first;
  const lineColor = rising ? 'var(--color-bull-teal)' : 'var(--color-bull-coral)';
  const gradientId = `chart-gradient-${symbol.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const spread = rawMax - rawMin;
  const padding = spread > 0 ? spread * 0.16 : Math.max(rawMax * 0.005, 1);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const range = max - min || 1;

  const sessionStart = Number(session?.start);
  const sessionSpan = session && Number(session.end) > sessionStart ? Number(session.end) - sessionStart : 0;

  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      sessionSpan && Number.isFinite(Number(point.time))
        ? pad.left + Math.max(0, Math.min(1, (Number(point.time) - sessionStart) / sessionSpan)) * plotWidth
        : pad.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth),
    y: pad.top + ((max - point.value) / range) * plotHeight,
  }));

  // Your orders: O = buy, X = sell. Each sits on the line at the time of the order.
  const markerPoints = (markers || [])
    .map((m) => {
      if (!coordinates.length) return null;
      if (sessionSpan && (m.time < sessionStart || m.time > sessionStart + sessionSpan)) return null;
      let best = null;
      let bestDist = Infinity;
      coordinates.forEach((c) => {
        const d = Math.abs(Number(c.time) - m.time);
        if (d < bestDist) { bestDist = d; best = c; }
      });
      if (!best) return null;
      const x = sessionSpan
        ? pad.left + ((m.time - sessionStart) / sessionSpan) * plotWidth
        : best.x;
      return { ...m, x, y: best.y };
    })
    .filter(Boolean);

  const smoothPath = coordinates.reduce((path, point, index, array) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = array[index - 1];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaPath = coordinates.length
    ? `${smoothPath} L ${coordinates[coordinates.length - 1].x} ${pad.top + plotHeight} L ${coordinates[0].x} ${pad.top + plotHeight} Z`
    : '';

  const activePoint =
    hoverIndex !== null ? coordinates[hoverIndex] : coordinates[coordinates.length - 1];

  const handlePointerMove = (event) => {
    const svg = svgRef.current;
    if (!svg || !coordinates.length) return;

    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * width;
    const plotX = Math.max(pad.left, Math.min(width - pad.right, relativeX));
    let index = 0;
    let best = Infinity;
    coordinates.forEach((c, i) => {
      const d = Math.abs(c.x - plotX);
      if (d < best) { best = d; index = i; }
    });

    setHoverIndex(index);
  };

  const formatTime = (time, index) => {
    if (time !== undefined && time !== null && time !== '') {
      const date =
        typeof time === 'number'
          ? new Date(time < 1e12 ? time * 1000 : time)
          : new Date(time);

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }

      return String(time);
    }

    return `Point ${index + 1}`;
  };

  if (!points.length) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">
            Generated price series
          </div>
          <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${rising ? 'text-emerald-300' : 'text-rose-300'}`}>
            {money(last)}
            <span className="ml-2 text-[10px] font-bold tracking-wide text-slate-500">
              {rising ? '↗ UPTREND' : '↘ DOWNTREND'}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={'text-sm font-black font-mono mb-1 ' + (rising ? 'text-emerald-300' : 'text-rose-300')}>
            {(rising ? '+' : '') + (first ? (((last - first) / first) * 100).toFixed(2) : '0.00') + '%'}
            <span className="ml-1 text-[10px] font-bold text-slate-500">in this view</span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Range</div>
          <div className="text-xs font-mono text-slate-300 mt-1">
            {money(rawMin)} – {money(rawMax)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-bull-bg overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${symbol} simulated price chart`}
          className="block w-full h-auto touch-pan-y"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
              <stop offset="65%" stopColor={lineColor} stopOpacity="0.07" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${gradientId}-clip`}>
              <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          {Array.from({ length: 5 }, (_, index) => {
            const y = pad.top + (plotHeight / 4) * index;
            const value = max - (range / 4) * index;

            return (
              <g key={`grid-${index}`}>
                <line
                  x1={pad.left}
                  x2={width - pad.right + 5}
                  y1={y}
                  y2={y}
                  stroke="#fff"
                  strokeOpacity="0.075"
                  strokeDasharray={index === 4 ? '0' : '3 6'}
                />
                <text
                  x={width - pad.right + 12}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {value.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    notation: 'compact',
                  })}
                </text>
              </g>
            );
          })}

          {Array.from({ length: 5 }, (_, index) => {
            const x = pad.left + (plotWidth / 4) * index;
            const pointIndex = Math.round(((points.length - 1) * index) / 4);
            const point = points[pointIndex];

            return (
              <g key={`time-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={pad.top}
                  y2={pad.top + plotHeight}
                  stroke="#fff"
                  strokeOpacity="0.035"
                />
                <text
                  x={x}
                  y={height - 8}
                  textAnchor={index === 0 ? 'start' : index === 4 ? 'end' : 'middle'}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {sessionSpan
                    ? session.range && session.range !== 'day'
                      ? formatTime(sessionStart + (sessionSpan * index) / 4, pointIndex)
                      : index === 0 ? '00:00' : index === 4 ? '24:00' : formatTime(sessionStart + (sessionSpan * index) / 4, pointIndex)
                    : formatTime(point?.time, pointIndex)}
                </text>
              </g>
            );
          })}

          <g clipPath={`url(#${gradientId}-clip)`}>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={smoothPath}
              fill="none"
              stroke={lineColor}
              strokeOpacity="0.13"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={smoothPath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {activePoint && (
              <>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={pad.top}
                  y2={pad.top + plotHeight}
                  stroke={lineColor}
                  strokeOpacity="0.45"
                  strokeDasharray="4 5"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="8"
                  fill={lineColor}
                  fillOpacity="0.14"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="3.5"
                  fill={lineColor}
                  stroke="var(--color-bull-bg)"
                  strokeWidth="1.5"
                />
              </>
            )}
          </g>

          {markerPoints.map((m, i) => (
            <g key={'mk-' + i}>
              <title>
                {(m.side === 'BUY' ? 'Bought ' : 'Sold ') + m.qty + ' at ' + money(m.price) + ' (' + formatTime(m.time, i) + ')'}
              </title>
              {m.side === 'BUY' ? (
                <>
                  <circle className="mk-halo" cx={m.x} cy={m.y} r="10" fill="var(--color-bull-teal)" fillOpacity="0.16" />
                  <circle cx={m.x} cy={m.y} r="4.6" fill="var(--color-bull-teal)" stroke="var(--color-bull-bg)" strokeWidth="1.6" />
                </>
              ) : (
                <>
                  <circle className="mk-halo" cx={m.x} cy={m.y} r="9" fill="var(--color-bull-coral)" fillOpacity="0.14" />
                  <path
                    d={'M ' + (m.x - 3.2) + ' ' + (m.y - 3.2) + ' L ' + (m.x + 3.2) + ' ' + (m.y + 3.2) + ' M ' + (m.x + 3.2) + ' ' + (m.y - 3.2) + ' L ' + (m.x - 3.2) + ' ' + (m.y + 3.2)}
                    stroke="var(--color-bull-coral)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </g>
          ))}

          {activePoint && (
            <g>
              <rect
                x={width - pad.right + 5}
                y={Math.max(pad.top, Math.min(pad.top + plotHeight - 23, activePoint.y - 11))}
                width={pad.right - 7}
                height="22"
                rx="5"
                fill={lineColor}
                fillOpacity="0.13"
              />
              <text
                x={width - pad.right + 10}
                y={Math.max(pad.top + 14, Math.min(pad.top + plotHeight - 7, activePoint.y + 4))}
                fill={lineColor}
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
              >
                {Number(activePoint.value).toLocaleString('en-IN', {
                  maximumFractionDigits: 2,
                })}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: lineColor }} />
          <span>{symbol} · {points.length} generated points</span>
        </div>
        <span>{activePoint ? formatTime(activePoint.time, activePoint.index) : 'Hover to inspect'}</span>
      </div>
    </div>
  );
}
export default function RealSimulatorPage() {
  const [user, setUser] = useState(null);
  const [realBalance, setRealBalance] = useState(START_BALANCE);
  const [realHoldings, setRealHoldings] = useState({});
  const [selectedRealStock, setSelectedRealStock] = useState('GOLDVLT');
  const [selectedCategory, setSelectedCategory] = useState('Commodities');
  const [realQtyInput, setRealQtyInput] = useState('1');
  const [prices, setPrices] = useState({});
  const [session, setSession] = useState(null);
  const [news, setNews] = useState([]);
  const [chartRange, setChartRange] = useState('day');

  // Remember the chart range this browser chose last.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bullrun_chart_range');
      if (saved === '15m' || saved === '1h' || saved === 'day') setChartRange(saved);
    } catch (e) {}
  }, []);

  const chooseRange = (key) => {
    setChartRange(key);
    try { localStorage.setItem('bullrun_chart_range', key); } catch (e) {}
  };
  const [marketMessage, setMarketMessage] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);
  const [indiaTime, setIndiaTime] = useState('--:--:--');
  const [orderStage, setOrderStage] = useState('IDLE');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [processingStatusText, setProcessingStatusText] = useState('Preparing simulated order...');
  const [executedReceipt, setExecutedReceipt] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [portfolioError, setPortfolioError] = useState('');
  const saveTimerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIndiaTime(getIndiaClock(now));
      setMarketOpen(true);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Opening bell: rings once at 9:15 AM IST on weekdays (real NSE open time).
  useEffect(() => {
    const audio = new Audio('/sounds/bull_run_bell.mp3');
    audio.preload = 'auto';
    let unlocked = false;
    let lastRung = '';

    // Browsers block sound until the user has interacted with the page once.
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      audio.muted = true;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
          unlocked = false;
        });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const check = () => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());
      const get = (type) => parts.find((p) => p.type === type)?.value;

      const weekday = get('weekday');
      const minutes = Number(get('hour')) * 60 + Number(get('minute'));
      const seconds = Number(get('second'));
      const dayKey = `${get('year')}-${get('month')}-${get('day')}`;

      const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';
      if (isWeekday && minutes === 9 * 60 + 15 && seconds < 10 && lastRung !== dayKey) {
        lastRung = dayKey;
        audio.currentTime = 0;
        audio.play().catch((error) => console.error('Bell blocked:', error));
      }
    };

    const timer = setInterval(check, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.pause();
    };
  }, []);

  const calculateHoldingsValue = useCallback((holdings, priceMap) => (
    Object.values(holdings || {}).reduce((sum, holding) => {
      const price = Number(priceMap?.[holding.sym]?.price || holding.avgPrice || 0);
      const shares = Number(holding.shares || 0);
      return sum + price * shares;
    }, 0)
  ), []);

  // Net worth is calculated and saved on the server. The browser never writes money.
  const persistNetWorth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;
      const res = await fetch('/api/sync-networth', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch (error) {
      console.error('Net worth sync failed:', error);
      return false;
    }
  }, []);

  // The database is the single source of truth, so every device sees the same portfolio.
  const loadPortfolio = useCallback(async (userId) => {
    const [
      { data: profile, error: profileError },
      { data: rows, error: holdingsError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_holdings')
        .select('sym, shares, avg_price')
        .eq('user_id', userId),
    ]);

    const describe = (e) =>
      [e?.message, e?.code, e?.details, e?.hint].filter(Boolean).join(' | ') ||
      JSON.stringify(e, Object.getOwnPropertyNames(e || {}));

    if (profileError) console.error('Profile restore failed:', describe(profileError));
    if (holdingsError) console.error('Holdings restore failed:', describe(holdingsError));

    if (profileError || holdingsError) {
      setPortfolioError(
        profileError
          ? 'profiles: ' + describe(profileError)
          : 'user_holdings: ' + describe(holdingsError)
      );
      return null;
    }

    const holdings = {};
    (rows || []).forEach((row) => {
      holdings[row.sym] = {
        sym: row.sym,
        shares: Number(row.shares),
        avgPrice: Number(row.avg_price),
      };
    });

    const savedBalance = profile?.wallet_balance;
    const balance = Number(savedBalance);
    const hasBalance =
      savedBalance !== null && savedBalance !== undefined && Number.isFinite(balance);

    return { balance: hasBalance ? balance : null, holdings };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncUserSession = async () => {
      if (busyRef.current) return;

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (cancelled) return;

        if (session?.user) {
          const currentUser = session.user;
          setUser(currentUser);

          const restored = await loadPortfolio(currentUser.id);
          if (cancelled || busyRef.current) return;

          if (!restored) {
            setPortfolioReady(false);
            setMarketMessage(
              'Could not load your saved portfolio. Refresh the page; trading is paused to protect your data.'
            );
            return;
          }

          const balance = restored.balance;

          if (balance === null) {
            setPortfolioReady(false);
            setMarketMessage(
              'Your practice wallet is not set up yet. Please log out and back in, or contact support.'
            );
            return;
          }

          if (!cancelled) {
            setRealHoldings(restored.holdings);
            setRealBalance(balance);
            setPortfolioReady(true);
            setPortfolioError('');
            setMarketMessage('');

            localStorage.setItem(`bullrun_wallet_${currentUser.id}`, String(balance));
            localStorage.setItem(
              `bullrun_holdings_${currentUser.id}`,
              JSON.stringify(restored.holdings)
            );
          }
        } else {
          setUser(null);
          setPortfolioReady(false);

          let guestHoldings = {};

          try {
            guestHoldings = JSON.parse(
              localStorage.getItem('bullrun_guest_holdings') || '{}'
            );
          } catch {
            guestHoldings = {};
          }

          const cachedBalance = localStorage.getItem('bullrun_guest_wallet');
          const guestBalance =
            cachedBalance === null ? START_BALANCE : Number(cachedBalance);

          if (!cancelled) {
            setRealHoldings(guestHoldings);
            setRealBalance(
              Number.isFinite(guestBalance) ? guestBalance : START_BALANCE
            );
          }
        }
      } catch (error) {
        console.error('Wallet/session restore failed:', error);
      }
    };

    syncUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) syncUserSession();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadPortfolio]);

  // Pull in trades made on other devices (every 20s and when the tab regains focus).
  useEffect(() => {
    if (!user || !portfolioReady) return undefined;

    let cancelled = false;

    const resync = async () => {
      if (busyRef.current || document.hidden) return;

      const latest = await loadPortfolio(user.id);
      if (cancelled || busyRef.current || !latest) return;

      if (latest.balance !== null) setRealBalance(latest.balance);
      setRealHoldings(latest.holdings);
    };

    const timer = setInterval(resync, 20000);
    document.addEventListener('visibilitychange', resync);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [user, portfolioReady, loadPortfolio]);
  const fetchSimulatedPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/historical-prices?range=' + chartRange, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Price API error:', response.status, errorText);
        throw new Error(`Price API returned ${response.status}`);
      }

      const json = await response.json();
      const next = {};

      (json.prices || []).forEach((item) => {
        const price = Number(item.price);

        if (item.symbol && Number.isFinite(price) && price > 0) {
          next[item.symbol] = {
            price,
            changePct: String(item.changePct ?? '0.00%'),
            history: Array.isArray(item.history) ? item.history : [],
            prototype: true,
          };
        }
      });

      if (Object.keys(next).length) {
        setPrices(next);
        setSession(json.session || null);
        setNews(Array.isArray(json.news) ? json.news : []);
        setMarketMessage('');
      } else {
        setMarketMessage('The price service returned no usable simulated prices.');
      }
    } catch (error) {
      console.error('Could not load simulated prices:', error);
      setMarketMessage(
        'Could not load simulated prices. Check that the development server and price API are running.'
      );
    } finally {
      setLoadingPrices(false);
    }
  }, [chartRange]);

  // Refresh on shared wall-clock boundaries (e.g. :00, :15, :30, :45 seconds),
  // so every device asks for the same price tick at the same moment.
  useEffect(() => {
    let cancelled = false;
    let timer;

    fetchSimulatedPrices();

    const schedule = () => {
      const now = Date.now();
      const next = Math.ceil((now + 1) / PRICE_REFRESH_MS) * PRICE_REFRESH_MS + 1000;

      timer = setTimeout(async () => {
        await fetchSimulatedPrices();
        if (!cancelled) schedule();
      }, next - now);
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchSimulatedPrices]);
  const getHoldingsValue = useCallback(
    () => calculateHoldingsValue(realHoldings, prices),
    [realHoldings, prices, calculateHoldingsValue]
  );

  // Keeps the leaderboard value (cash + holdings at the shared price) up to date.
  useEffect(() => {
    if (!user || !portfolioReady || !Object.keys(prices).length) return undefined;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      if (!busyRef.current) {
        persistNetWorth(user.id, realBalance, realHoldings, prices);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [realBalance, realHoldings, prices, user, portfolioReady, persistNetWorth]);
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('trade_history')
      .select('id, sym, side, qty, price, gross, fees_total, asset_class, trade_type, realized_gross, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setHistoryError('Could not load your order history.');
    } else {
      setHistoryError('');
      setHistoryRows(data || []);
    }
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => {
    if (activePanel === 'history') loadHistory();
  }, [activePanel, executedReceipt, loadHistory]);

  const [chartTrades, setChartTrades] = useState([]);

  useEffect(() => {
    if (!user) {
      setChartTrades([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase
        .from('trade_history')
        .select('side, qty, price, created_at')
        .eq('user_id', user.id)
        .eq('sym', selectedRealStock)
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (!cancelled) setChartTrades(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedRealStock, executedReceipt]);

  const chartMarkers = useMemo(
    () =>
      chartTrades.map((r) => ({
        time: Math.floor(new Date(r.created_at).getTime() / 1000),
        price: Number(r.price),
        qty: Number(r.qty),
        side: r.side,
      })),
    [chartTrades]
  );

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const loadReport = useCallback(async () => {
    if (!user) return;
    setReportLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch('/api/report-card', {
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + (authSession?.access_token || '') },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not build your report card.');
      setReport(json);
      setReportError('');
    } catch (e) {
      setReportError(e.message || 'Could not build your report card.');
    }
    setReportLoading(false);
  }, [user]);

  useEffect(() => {
    if (activePanel === 'report') loadReport();
  }, [activePanel, executedReceipt, loadReport]);

  const ownedRows = useMemo(
    () =>
      Object.values(realHoldings || {})
        .filter((h) => Number(h.shares) > 0)
        .map((h) => {
          const meta = ASSET_BY_SYM[h.sym];
          const price = Number(prices[h.sym]?.price || h.avgPrice || 0);
          const shares = Number(h.shares);
          const avg = Number(h.avgPrice || 0);
          const value = price * shares;
          const pnl = (price - avg) * shares;
          const pnlPct = avg > 0 ? ((price - avg) / avg) * 100 : 0;
          return {
            sym: h.sym,
            name: meta ? meta.name : h.sym,
            category: meta ? meta.category : null,
            tradable: meta ? meta.tradable : true,
            shares,
            avg,
            price,
            value,
            pnl,
            pnlPct,
          };
        })
        .sort((a, b) => b.value - a.value),
    [realHoldings, prices]
  );

  const filteredAssets = useMemo(
    () => ASSETS.filter((asset) => asset.category === selectedCategory),
    [selectedCategory]
  );

  const activeAsset =
    ASSETS.find((asset) => asset.sym === selectedRealStock) || ASSETS[0];

  const activeQuote = prices[selectedRealStock] || {
    price: 0,
    changePct: 'Loading…',
    history: [],
  };

  const callTradeApi = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Please log in again to place orders.');

    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Order request failed.');
    return json;
  };

  const resetOrderDesk = () => {
    setOrderStage('IDLE');
    setPendingOrder(null);
    setExecutedReceipt(null);
  };

  const initiateOrderReview = async (type, symOverride, qtyOverride) => {
    if (quoteLoading) return;
    if (user && !portfolioReady) {
      alert('Your saved portfolio is still loading. Please try again in a moment.');
      return;
    }

    const sym = symOverride || selectedRealStock;
    const asset = ASSET_BY_SYM[sym] || activeAsset;

    if (!asset.tradable) {
      alert('This is a view-only index. Buy a fund that tracks it instead.');
      return;
    }

    const price = Number(prices[sym]?.price);
    const qty = Number(qtyOverride !== undefined ? qtyOverride : realQtyInput);

    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Enter a valid quantity greater than zero.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      alert('Price is not available yet.');
      return;
    }

    const total = Number((price * qty).toFixed(2));
    const holding = realHoldings[sym];

    if (type === 'BUY' && total > realBalance) {
      alert('Insufficient cash balance.');
      return;
    }

    if (type === 'SELL' && (!holding || qty > holding.shares)) {
      alert('Insufficient shares to sell.');
      return;
    }

    if (!user) {
      alert('Please log in to place simulated orders.');
      return;
    }

    setQuoteLoading(true);
    try {
      const quote = await callTradeApi({
        action: 'quote',
        sym,
        side: type,
        qty,
      });

      if (quote.error) {
        alert(quote.error);
        return;
      }

      setPendingOrder({
        sym,
        name: asset.name,
        type,
        qty,
        price: quote.price,
        marketPrice: quote.marketPrice,
        slippageAmount: quote.slippageAmount,
        slippageBps: quote.slippageBps,
        totalCost: quote.gross,
        costs: quote.fees,
        cashEffect: quote.cashEffect,
        intradayQty: quote.intradayQty,
        deliveryQty: quote.deliveryQty,
      });

      setExecutedReceipt(null);
      setOrderStage('REVIEW');
    } catch (error) {
      alert(error.message || 'Could not prepare this order.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const executeOrder = async () => {
    if (!pendingOrder || orderStage === 'PROCESSING') return;

    setOrderStage('PROCESSING');
    setProcessingStatusText('Sending your order to the simulated market...');

    const { sym, type, qty } = pendingOrder;

    try {
      const result = await callTradeApi({ action: 'execute', sym, side: type, qty });

      setRealBalance(Number(result.balance));
      const latest = await loadPortfolio(user.id);
      if (latest) setRealHoldings(latest.holdings);

      setExecutedReceipt({
        orderId: `SIM-${String(result.historyId || '').slice(0, 8).toUpperCase()}`,
        timestamp: getIndiaClock(),
        sym,
        type,
        qty,
        price: Number(result.price),
        totalCost: Number(result.gross),
        feesTotal: Number(result.fees?.total || 0),
        cashEffect: Number(result.cashEffect),
        newBalance: Number(result.balance),
      });

      setOrderStage('SUCCESS');
    } catch (error) {
      alert(error.message || 'Order failed. Nothing was changed.');
      resetOrderDesk();
    }
  };

  const scrollToOrderDesk = () => {
    setTimeout(() => {
      const el = document.getElementById('order-desk');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openOwnedAsset = (row) => {
    setSelectedRealStock(row.sym);
    if (row.category) setSelectedCategory(row.category);
    setActivePanel(null);
    if (orderStage !== 'IDLE') resetOrderDesk();
    scrollToOrderDesk();
  };

  const quickSell = (row) => {
    setSelectedRealStock(row.sym);
    if (row.category) setSelectedCategory(row.category);
    setRealQtyInput(String(row.shares));
    setActivePanel(null);
    if (orderStage !== 'IDLE') resetOrderDesk();
    scrollToOrderDesk();
    initiateOrderReview('SELL', row.sym, row.shares);
  };

  const processAndExecuteOrder = async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      await executeOrder();
    } finally {
      busyRef.current = false;
    }
  };

  const holdingsValue = getHoldingsValue();
  const netWorth = Number((realBalance + holdingsValue).toFixed(2));
  const netReturn = netWorth - START_BALANCE;

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-20 pb-28">
      <Navbar />

      <div className="max-w-[1240px] mx-auto px-4 pt-4 space-y-6">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-bull-line pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              <span className="text-bull-lime">BULL RUN</span> MULTI-ASSET SIMULATOR
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Practice with generated prices. No live exchange execution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="bg-bull-surface border border-bull-line px-3.5 py-2 rounded-xl text-xs">
              <span className="text-slate-500 mr-2">INDIA TIME</span>
              <span className="font-mono font-black text-white tabular-nums">{indiaTime}</span>
            </div>

            <div className={`border px-3.5 py-2 rounded-xl text-xs font-bold ${marketOpen ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
              {marketOpen ? 'SIMULATED MARKET OPEN 24/7' : 'SIMULATED MARKET OPEN 24/7'}
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-xs text-amber-200">
          These are illustrative simulated prices and generated chart points, not verified historical exchange data or investment advice. Every company, currency, fund and index here is fictional.
        </div>

        {portfolioError && (
          <div className="p-3 rounded-xl text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300 break-words">
            Portfolio load error: {portfolioError}
          </div>
        )}

        {marketMessage && (
          <div className="p-3 rounded-xl text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300">
            {marketMessage}
          </div>
        )}

        <div data-top-actions className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActivePanel(activePanel === 'owned' ? null : 'owned')}
            className={'py-3 rounded-xl text-xs font-black uppercase ' + (activePanel === 'owned' ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised border border-bull-line text-slate-200')}
          >
            Owned assets ({ownedRows.length})
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
            className={'py-3 rounded-xl text-xs font-black uppercase ' + (activePanel === 'history' ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised border border-bull-line text-slate-200')}
          >
            Order history
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'report' ? null : 'report')}
            className={'py-3 rounded-xl text-xs font-black uppercase ' + (activePanel === 'report' ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised border border-bull-line text-slate-200')}
          >
            Report card
          </button>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Available Cash', realBalance, 'text-white'],
            ['Holdings Value', holdingsValue, 'text-white'],
            ['Account Net Worth', netWorth, 'text-emerald-400'],
            ['Net Return', netReturn, netReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-bull-surface border border-bull-line rounded-2xl p-4">
              <div className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                {label}
              </div>
              <div className={`text-lg font-black mt-1 font-mono ${color}`}>
                {money(value)}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="bg-bull-surface border border-bull-line rounded-3xl p-4 h-fit">
            <div className="flex justify-between items-center pb-3 border-b border-bull-line text-xs font-black uppercase">
              <span>Asset Watchlist</span>
              <span className="text-bull-lime">{filteredAssets.length} assets</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto py-3">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl whitespace-nowrap ${selectedCategory === category ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised text-slate-400 border border-bull-line'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="divide-y divide-bull-line max-h-[520px] overflow-y-auto">
              {filteredAssets.map((asset) => {
                const quote = prices[asset.sym];
                const holding = realHoldings[asset.sym];
                const selected = selectedRealStock === asset.sym;

                return (
                  <button
                    key={asset.sym}
                    onClick={() => {
                      setSelectedRealStock(asset.sym);
                      if (orderStage !== 'IDLE') resetOrderDesk();
                    }}
                    className={`w-full p-3 text-left flex justify-between items-center rounded-xl my-1 ${selected ? 'bg-bull-raised border border-bull-lime/50' : 'hover:bg-bull-raised'}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-black text-sm">{asset.sym}</div>
                      <div className="text-[10px] text-slate-400 truncate">{asset.name}</div>
                      {holding && (
                        <div className="text-[10px] text-emerald-400 mt-1">
                          Owned: {holding.shares}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs">
                        {quote ? money(quote.price) : loadingPrices ? 'Loading…' : 'Unavailable'}
                      </div>
                      <div className={`text-[10px] font-bold font-mono ${quote?.changePct?.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {quote?.changePct || '—'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section id="order-desk" className="lg:col-span-2 space-y-6 scroll-mt-24">
            <div className="bg-bull-surface border border-bull-line p-5 sm:p-6 rounded-3xl">
              {orderStage === 'IDLE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-[10px] uppercase font-black text-bull-lime">
                      {activeAsset.sector}
                    </div>
                    <h2 className="text-xl font-black">{activeAsset.name}</h2>
                    <div className="text-3xl font-black font-mono">
                      {activeQuote.price ? money(activeQuote.price) : 'Loading price…'}
                    </div>
                    <div className={`text-sm font-bold ${activeQuote.changePct?.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activeQuote.changePct}
                    </div>

                    <label htmlFor="order-quantity" className="block text-[10px] font-black uppercase text-slate-400">
                      Order size / units
                    </label>
                    <input
                      id="order-quantity"
                      type="number"
                      min="0.001"
                      step="any"
                      value={realQtyInput}
                      onChange={(event) => setRealQtyInput(event.target.value)}
                      className="w-full border border-bull-line rounded-xl px-4 py-3 text-sm font-mono font-bold bg-bull-raised focus:outline-none focus:border-bull-lime"
                    />

                    {!activeAsset.tradable && (
                      <p className="text-xs text-amber-300">
                        View-only index. To invest in it, buy the fund that tracks it (see the ETFs tab).
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => initiateOrderReview('BUY')}
                        disabled={!activeAsset.tradable}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs uppercase font-black py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Buy asset
                      </button>
                      <button
                        onClick={() => initiateOrderReview('SELL')}
                        disabled={!activeAsset.tradable}
                        className="flex-1 bg-rose-700 hover:bg-rose-600 text-white text-xs uppercase font-black py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sell asset
                      </button>
                    </div>
                  </div>

                  <div className="bg-bull-raised border border-bull-line p-4 rounded-2xl space-y-3 text-xs">
                    <h3 className="font-black uppercase text-slate-400">Asset profile</h3>
                    {[
                      ['Market cap', activeAsset.cap],
                      ['P/E', activeAsset.pe],
                      ['EPS', activeAsset.eps === 'N/A' ? 'N/A' : `₹${activeAsset.eps}`],
                      ['Dividend yield', activeAsset.div],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-bull-line pb-2 last:border-0">
                        <span className="text-slate-400">{label}</span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orderStage === 'REVIEW' && pendingOrder && (
                <div className="space-y-5">
                  <h2 className="font-black text-lg">
                    {pendingOrder.type} ORDER · {pendingOrder.name}
                  </h2>

                  <div className="grid grid-cols-2 gap-3 bg-bull-raised border border-bull-line p-4 rounded-xl text-xs">
                    <div><span className="block text-slate-400">Units</span><b>{pendingOrder.qty}</b></div>
                    <div><span className="block text-slate-400">Price per unit</span><b>{money(pendingOrder.price)}</b></div>
                  </div>
                  {pendingOrder.marketPrice !== undefined && (
                    <p className="text-[11px] text-slate-400">
                      Screen price {money(pendingOrder.marketPrice)}. Your fill price is {money(pendingOrder.price)} because of slippage ({Number(pendingOrder.slippageBps || 0).toFixed(2)}%, about {money(pendingOrder.slippageAmount)} in total). Thin assets and big orders slip more.
                    </p>
                  )}

                  <div className="bg-bull-raised border border-bull-line p-4 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Order value</span>
                      <span>{money(pendingOrder.totalCost)}</span>
                    </div>
                    {(pendingOrder.costs?.lines || []).map((line) => (
                      <div key={line.key} className="flex justify-between text-slate-400">
                        <span>{line.label}</span>
                        <span className={line.amount < 0 ? 'text-bull-teal' : ''}>
                          {line.amount < 0 ? '-' : ''}{money(Math.abs(line.amount))}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-bull-line pt-1.5 font-black">
                      <span>{pendingOrder.type === 'BUY' ? 'You pay in total' : 'You receive after charges'}</span>
                      <span className="text-bull-lime">{money(pendingOrder.cashEffect)}</span>
                    </div>
                    {pendingOrder.intradayQty > 0 && (
                      <p className="text-slate-400 pt-1">
                        {pendingOrder.intradayQty} of these units were bought today, so they are treated as an intraday trade.
                      </p>
                    )}
                    <p className="text-slate-500 pt-1">
                      Practice charges for a fictional market. All names and rates are invented. Not real money.
                    </p>
                  </div>

                  <p className="text-xs text-amber-300">
                    This is a simulated practice order, not an order sent to an exchange.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={processAndExecuteOrder}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 py-3 rounded-xl text-xs font-black uppercase"
                    >
                      Confirm simulated order
                    </button>
                    <button
                      onClick={resetOrderDesk}
                      className="px-5 bg-bull-raised border border-bull-line rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {orderStage === 'PROCESSING' && (
                <div className="py-10 text-center">
                  <div className="animate-spin h-10 w-10 border-4 border-bull-lime/20 border-t-bull-lime rounded-full mx-auto mb-4" />
                  <b>{processingStatusText}</b>
                  <p className="text-xs text-slate-400 mt-2">
                    Updating the practice portfolio…
                  </p>
                </div>
              )}

              {orderStage === 'SUCCESS' && executedReceipt && (
                <div className="space-y-4">
                  <div className="text-emerald-300 font-black">
                    Simulated order completed · {executedReceipt.orderId}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-bull-raised border border-bull-line p-4 rounded-xl text-xs">
                    {[
                      ['Asset / side', `${executedReceipt.sym} / ${executedReceipt.type}`],
                      ['Units', executedReceipt.qty],
                      ['Execution price', money(executedReceipt.price)],
                      ['Order value', money(executedReceipt.totalCost)],
                      ['Total charges', (executedReceipt.feesTotal < 0 ? '-' : '') + money(Math.abs(executedReceipt.feesTotal))],
                      [executedReceipt.type === 'BUY' ? 'Cash paid' : 'Cash received', money(executedReceipt.cashEffect)],
                      ['Cash remaining', money(executedReceipt.newBalance)],
                      ['India time', executedReceipt.timestamp],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="block text-slate-400">{label}</span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={resetOrderDesk}
                    className="bg-bull-lime hover:bg-bull-lime-light text-bull-ink px-5 py-3 rounded-xl text-xs font-black uppercase"
                  >
                    Done / new order
                  </button>
                </div>
              )}
            </div>

            <div className="bg-bull-bg border border-bull-line rounded-3xl overflow-hidden p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <div>
                  <h3 className="font-black text-sm">
                    {selectedRealStock} · Simulated price history
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Generated series · not exchange history
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[['15m', '15 min'], ['1h', '1 hour'], ['day', 'Day']].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => chooseRange(key)}
                      className={'text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ' + (chartRange === key ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised text-slate-400 border border-bull-line')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <PriceChart
                key={selectedRealStock}
                history={activeQuote.history}
                symbol={selectedRealStock}
                session={session}
                markers={chartMarkers}
              />

              <div className="mt-3 text-[10px] text-slate-500">
                {session?.range === '15m' ? 'The chart shows the last 15 minutes of the simulated market.' : session?.range === '1h' ? 'The chart shows the last hour of the simulated market.' : "The chart shows today's simulated day in India time, 00:00 to 24:00."} A green dot marks a buy and a red x marks a sale. It is not a record of past trading sessions.
              </div>

              {(() => {
                const items = (news || [])
                  .filter((n) => n.scope === 'market' || n.sym === selectedRealStock || (n.scope === 'sector' && n.category === activeAsset.category))
                  .slice(0, 4);
                return (
                  <div className="mt-4 border-t border-bull-line pt-3">
                    <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Market news (simulated)</div>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-500">No news for this asset in the last 24 hours.</p>
                    ) : (
                      items.map((n) => (
                        <div key={n.id} className="flex gap-2 text-xs py-1.5">
                          <span className={'font-black ' + (n.direction > 0 ? 'text-bull-teal' : 'text-bull-coral')}>
                            {n.direction > 0 ? '\u25B2' : '\u25BC'}
                          </span>
                          <span className="text-slate-200 flex-1">{n.headline}</span>
                          <span className="text-slate-500 font-mono shrink-0">
                            {new Date(n.time * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      ))
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">
                      Invented headlines from a fictional newsroom. News is not advice and does not predict prices.
                    </p>
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      </div>

      {activePanel && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
          onClick={() => setActivePanel(null)}
        >
          <div
            className="w-full max-w-[900px] max-h-[75vh] overflow-y-auto bg-bull-surface border border-bull-line rounded-t-3xl p-4 sm:p-5 pb-24"
            onClick={(event) => event.stopPropagation()}
          >
            {activePanel === 'owned' && (
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-bull-line">
                  <h3 className="font-black text-sm uppercase">Owned assets</h3>
                  <span className="text-[10px] text-slate-400">
                    Holdings value {money(holdingsValue)}
                  </span>
                </div>

                {ownedRows.length === 0 && (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    You do not own anything yet. Pick an asset and place a practice order.
                  </p>
                )}

                <div className="divide-y divide-bull-line">
                  {ownedRows.map((row) => (
                    <div key={row.sym} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        onClick={() => openOwnedAsset(row)}
                        className="text-left min-w-0 sm:w-1/3"
                      >
                        <div className="font-black text-sm">{row.sym}</div>
                        <div className="text-[10px] text-slate-400 truncate">{row.name}</div>
                      </button>

                      <div className="grid grid-cols-3 gap-2 text-xs flex-1">
                        <div>
                          <span className="block text-[10px] text-slate-500">Units / avg</span>
                          <b className="font-mono">{row.shares}</b>
                          <span className="block text-[10px] text-slate-400 font-mono">{money(row.avg)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500">Price / value</span>
                          <b className="font-mono">{money(row.price)}</b>
                          <span className="block text-[10px] text-slate-400 font-mono">{money(row.value)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500">Profit / loss</span>
                          <b className={'font-mono ' + (row.pnl >= 0 ? 'text-bull-teal' : 'text-bull-coral')}>
                            {(row.pnl >= 0 ? '+' : '-') + money(Math.abs(row.pnl))}
                          </b>
                          <span className={'block text-[10px] font-mono ' + (row.pnl >= 0 ? 'text-bull-teal' : 'text-bull-coral')}>
                            {(row.pnlPct >= 0 ? '+' : '') + row.pnlPct.toFixed(2) + '%'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => quickSell(row)}
                        disabled={quoteLoading}
                        className="bg-rose-700 hover:bg-rose-600 text-white text-[10px] uppercase font-black px-4 py-2.5 rounded-xl disabled:opacity-50"
                      >
                        Sell all
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 pt-3">
                  Profit and loss here is before selling charges. Sell all opens the order review so you can see the exact charges first.
                </p>
              </div>
            )}

            {activePanel === 'report' && (
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-bull-line">
                  <h3 className="font-black text-sm uppercase">Report card</h3>
                  <span className="text-[10px] text-slate-400">Practice money only</span>
                </div>
                {reportError && <p className="text-xs text-rose-300 py-4">{reportError}</p>}
                {reportLoading && !report && <p className="text-xs text-slate-400 py-4">Building your report card...</p>}
                {report && (
                  <div className="space-y-4 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        ['Realized gain (after charges)', money(report.realizedGain), report.realizedGain >= 0 ? 'text-bull-teal' : 'text-bull-coral'],
                        ['Estimated practice tax', money(report.estimatedTax), 'text-slate-100'],
                        ['Gain after estimated tax', money(report.afterTaxGain), report.afterTaxGain >= 0 ? 'text-bull-teal' : 'text-bull-coral'],
                        ['Charges paid', money(report.chargesPaid), 'text-slate-100'],
                        ['Slippage paid', money(report.slippagePaid), 'text-slate-100'],
                        ['Win rate', report.winRatePct === null ? '-' : report.winRatePct + '% (' + report.wins + 'W / ' + report.losses + 'L)', 'text-slate-100'],
                        ['Average holding time', report.avgHoldDays === null ? '-' : report.avgHoldDays + ' days', 'text-slate-100'],
                        ['Orders', report.trades + ' (' + report.buys + ' buys, ' + report.sells + ' sells)', 'text-slate-100'],
                      ].map(([label, value, color]) => (
                        <div key={label} className="bg-bull-raised border border-bull-line rounded-xl p-3">
                          <div className="text-[10px] font-black tracking-wider text-slate-500 uppercase">{label}</div>
                          <div className={'text-sm font-black mt-1 font-mono ' + color}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-bull-raised border border-bull-line rounded-xl p-3">
                        <span className="block text-[10px] text-slate-500 uppercase font-black">Best sale</span>
                        <b>{report.best ? report.best.sym + '  +' + money(report.best.gain) : '-'}</b>
                      </div>
                      <div className="bg-bull-raised border border-bull-line rounded-xl p-3">
                        <span className="block text-[10px] text-slate-500 uppercase font-black">Worst sale</span>
                        <b>{report.worst ? report.worst.sym + '  -' + money(Math.abs(report.worst.gain)) : '-'}</b>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      The tax figure is an estimate for learning. It is not taken from your cash. Gains from units held under {report.rates.shortDays} days use an invented {Math.round(report.rates.shortRate * 100)}% rate; longer holds use an invented {Math.round(report.rates.longRate * 100)}% rate; losses are not refunded. Your sells are matched to your earliest buys first.
                      {report.unmatchedQty > 0 ? ' ' + report.unmatchedQty + ' sold units were bought before order history started and are left out.' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activePanel === 'history' && (
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-bull-line gap-3">
                  <h3 className="font-black text-sm uppercase">Order history</h3>
                  <div className="flex gap-1.5">
                    {[['ALL', 'All'], ['BUY', 'Buys'], ['SELL', 'Sells']].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setHistoryFilter(key)}
                        className={'text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ' + (historyFilter === key ? 'bg-bull-lime text-bull-ink' : 'bg-bull-raised text-slate-400 border border-bull-line')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {historyError && <p className="text-xs text-rose-300 py-4">{historyError}</p>}
                {historyLoading && historyRows.length === 0 && (
                  <p className="text-xs text-slate-400 py-8 text-center">Loading...</p>
                )}
                {!historyLoading && !historyError && historyRows.length === 0 && (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No orders yet. Your buys and sells will be listed here.
                  </p>
                )}

                <div className="divide-y divide-bull-line">
                  {historyRows
                    .filter((row) => historyFilter === 'ALL' || row.side === historyFilter)
                    .map((row) => {
                      const fees = Number(row.fees_total || 0);
                      const gross = Number(row.gross || 0);
                      const cash = row.side === 'BUY' ? gross + fees : gross - fees;
                      const showType =
                        row.trade_type && (row.asset_class === 'equity' || row.asset_class === 'etf');
                      const when = new Date(row.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                      return (
                        <div key={row.id} className="py-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs items-center">
                          <div>
                            <span className={'inline-block text-[10px] font-black px-2 py-0.5 rounded-md ' + (row.side === 'BUY' ? 'bg-emerald-900/50 text-bull-teal' : 'bg-rose-900/50 text-bull-coral')}>
                              {row.side === 'BUY' ? 'BOUGHT' : 'SOLD'}
                            </span>
                            <div className="font-black text-sm mt-1">{row.sym}</div>
                            <div className="text-[10px] text-slate-500">{when}</div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">Units at price</span>
                            <b className="font-mono">{Number(row.qty)} @ {money(row.price)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">Order value</span>
                            <b className="font-mono">{money(gross)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">Charges</span>
                            <b className="font-mono">{(fees < 0 ? '-' : '') + money(Math.abs(fees))}</b>
                            {showType && <span className="block text-[10px] text-slate-400">{row.trade_type}</span>}
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">
                              {row.side === 'BUY' ? 'Cash paid' : 'Cash received'}
                            </span>
                            <b className="font-mono">{money(cash)}</b>
                            {row.side === 'SELL' && row.realized_gross !== null && row.realized_gross !== undefined && (
                              <span className={'block text-[10px] font-mono ' + (Number(row.realized_gross) >= 0 ? 'text-bull-teal' : 'text-bull-coral')}>
                                {'P/L before charges ' + (Number(row.realized_gross) >= 0 ? '+' : '-') + money(Math.abs(Number(row.realized_gross)))}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <p className="text-[10px] text-slate-500 pt-3">
                  Shows your latest 100 orders. Dividends will appear here once they go live. Trades made before order history started are not listed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
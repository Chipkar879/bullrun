'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

const START_BALANCE = 50000;
const PRICE_REFRESH_MS = 15000;
const SAVE_DEBOUNCE_MS = 1000;

const ASSETS = [
  { sym: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', tv: 'BSE:GOLDBEES', sector: 'Commodities / Gold ETF', category: 'Crypto & ETFs', cap: '₹12.4K Cr', pe: 'N/A', eps: 'N/A', div: '0.00%' },
  { sym: 'SILVERBEES', name: 'Nippon India Silver ETF', tv: 'BSE:SILVERBEES', sector: 'Commodities / Silver ETF', category: 'Crypto & ETFs', cap: '₹3.8K Cr', pe: 'N/A', eps: 'N/A', div: '0.00%' },
  { sym: 'TATASTEEL', name: 'Tata Steel Ltd.', tv: 'BSE:TATASTEEL', sector: 'Metals & Mining', category: 'Crypto & ETFs', cap: '₹1.9L Cr', pe: '42.1', eps: '3.8', div: '2.40%' },
  { sym: 'HINDALCO', name: 'Hindalco Industries Ltd.', tv: 'BSE:HINDALCO', sector: 'Aluminum & Copper', category: 'Crypto & ETFs', cap: '₹1.4L Cr', pe: '14.2', eps: '45.1', div: '0.55%' },
  { sym: 'VEDL', name: 'Vedanta Limited', tv: 'BSE:VEDL', sector: 'Diversified Metals', category: 'Crypto & ETFs', cap: '₹1.6L Cr', pe: '11.5', eps: '38.0', div: '6.50%' },
  { sym: 'COALINDIA', name: 'Coal India Ltd.', tv: 'BSE:COALINDIA', sector: 'Energy & Mining', category: 'Crypto & ETFs', cap: '₹2.8L Cr', pe: '7.8', eps: '62.4', div: '5.20%' },
  { sym: 'HDFCBANK', name: 'HDFC Bank Ltd.', tv: 'BSE:HDFCBANK', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹5.9L Cr', pe: '15.8', eps: '49.2', div: '1.66%' },
  { sym: 'ICICIBANK', name: 'ICICI Bank Ltd.', tv: 'BSE:ICICIBANK', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹7.8L Cr', pe: '16.1', eps: '68.2', div: '0.85%' },
  { sym: 'SBIN', name: 'State Bank of India', tv: 'BSE:SBIN', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹7.2L Cr', pe: '10.5', eps: '72.0', div: '1.70%' },
  { sym: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', tv: 'BSE:BAJFINANCE', sector: 'NBFC / Lending', category: 'Banking & Finance', cap: '₹3.9L Cr', pe: '26.4', eps: '210.5', div: '0.35%' },
  { sym: 'INFY', name: 'Infosys Ltd.', tv: 'BSE:INFY', sector: 'Information Technology', category: 'Tech & Telecom', cap: '₹4.3L Cr', pe: '14.7', eps: '71.4', div: '4.55%' },
  { sym: 'TCS', name: 'Tata Consultancy Services', tv: 'BSE:TCS', sector: 'Information Technology', category: 'Tech & Telecom', cap: '₹7.8L Cr', pe: '15.8', eps: '136.0', div: '2.33%' },
  { sym: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', tv: 'BSE:BHARTIARTL', sector: 'Telecommunications', category: 'Tech & Telecom', cap: '₹8.1L Cr', pe: '54.0', eps: '24.1', div: '0.60%' },
  { sym: 'RELIANCE', name: 'Reliance Industries Ltd.', tv: 'BSE:RELIANCE', sector: 'Energy & Retail', category: 'Energy & Macro', cap: '₹17.9L Cr', pe: '37.7', eps: '35.2', div: '0.61%' },
  { sym: 'OIL', name: 'Oil India Limited', tv: 'BSE:OIL', sector: 'Energy & Petroleum', category: 'Energy & Macro', cap: '₹72.4K Cr', pe: '12.1', eps: '42.8', div: '2.80%' },
  { sym: 'NTPC', name: 'NTPC Ltd.', tv: 'BSE:NTPC', sector: 'Utilities & Power', category: 'Energy & Macro', cap: '₹3.7L Cr', pe: '18.2', eps: '21.0', div: '2.10%' },
  { sym: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', tv: 'BSE:ADANIPORTS', sector: 'Infrastructure & Ports', category: 'Energy & Macro', cap: '₹2.9L Cr', pe: '32.4', eps: '38.2', div: '0.50%' },
  { sym: 'SUNPHARMA', name: 'Sun Pharmaceutical Ind.', tv: 'BSE:SUNPHARMA', sector: 'Pharmaceuticals', category: 'Consumer & Pharma', cap: '₹3.6L Cr', pe: '34.2', eps: '41.0', div: '0.80%' },
  { sym: 'TITAN', name: 'Titan Company Ltd.', tv: 'BSE:TITAN', sector: 'Consumer Durables', category: 'Consumer & Pharma', cap: '₹2.8L Cr', pe: '82.4', eps: '38.5', div: '0.35%' },
  { sym: 'ITC', name: 'ITC Ltd.', tv: 'BSE:ITC', sector: 'FMCG / Consumer', category: 'Consumer & Pharma', cap: '₹5.8L Cr', pe: '28.5', eps: '16.2', div: '3.10%' },
  { sym: 'LT', name: 'Larsen & Toubro Ltd.', tv: 'BSE:LT', sector: 'Engineering & Infrastructure', category: 'Consumer & Pharma', cap: '₹4.9L Cr', pe: '31.2', eps: '92.0', div: '0.80%' },
  { sym: 'MARUTI', name: 'Maruti Suzuki India', tv: 'BSE:MARUTI', sector: 'Automobiles', category: 'Consumer & Pharma', cap: '₹3.8L Cr', pe: '28.4', eps: '412.0', div: '1.00%' },
];

const CATEGORIES = [
  'All Assets',
  'Crypto & ETFs',
  'Banking & Finance',
  'Tech & Telecom',
  'Energy & Macro',
  'Consumer & Pharma',
];

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

function PriceChart({ history, symbol }) {
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
  const lineColor = rising ? '#34d399' : '#fb7185';
  const gradientId = `chart-gradient-${symbol.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const spread = rawMax - rawMin;
  const padding = spread > 0 ? spread * 0.16 : Math.max(rawMax * 0.005, 1);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const range = max - min || 1;

  const coordinates = points.map((point, index) => ({
    ...point,
    x: pad.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth),
    y: pad.top + ((max - point.value) / range) * plotHeight,
  }));

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
    const index = Math.round(
      ((plotX - pad.left) / (plotWidth || 1)) * (coordinates.length - 1)
    );

    setHoverIndex(Math.max(0, Math.min(coordinates.length - 1, index)));
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
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Range</div>
          <div className="text-xs font-mono text-slate-300 mt-1">
            {money(rawMin)} – {money(rawMax)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#080b0a] overflow-hidden">
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
                  {formatTime(point?.time, pointIndex)}
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
                  stroke="#080b0a"
                  strokeWidth="1.5"
                />
              </>
            )}
          </g>

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
  const [selectedRealStock, setSelectedRealStock] = useState('GOLDBEES');
  const [selectedCategory, setSelectedCategory] = useState('All Assets');
  const [realQtyInput, setRealQtyInput] = useState('1');
  const [prices, setPrices] = useState({});
  const [marketMessage, setMarketMessage] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);
  const [indiaTime, setIndiaTime] = useState('--:--:--');
  const [orderStage, setOrderStage] = useState('IDLE');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [processingStatusText, setProcessingStatusText] = useState('Preparing simulated order...');
  const [executedReceipt, setExecutedReceipt] = useState(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIndiaTime(getIndiaClock(now));
      setMarketOpen(isIndianMarketOpen(now));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateHoldingsValue = useCallback((holdings, priceMap) => (
    Object.values(holdings || {}).reduce((sum, holding) => {
      const price = Number(priceMap?.[holding.sym]?.price || holding.avgPrice || 0);
      const shares = Number(holding.shares || 0);
      return sum + price * shares;
    }, 0)
  ), []);

  const persistPortfolio = useCallback(async (userId, balance, holdings, priceMap) => {
    if (!userId) return false;

    const cash = Number(balance);
    const holdingsValue = calculateHoldingsValue(holdings, priceMap);
    const totalNetWorth = Number((cash + holdingsValue).toFixed(2));

    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(totalNetWorth)) {
      console.error('Portfolio save skipped: invalid portfolio values.');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        wallet_balance: Number(cash.toFixed(2)),
        net_worth: totalNetWorth,
      })
      .eq('id', userId);

    if (error) {
      console.error('Portfolio save failed:', error);
      return false;
    }

    return true;
  }, [calculateHoldingsValue]);

  useEffect(() => {
    let cancelled = false;

    const syncUserSession = async () => {
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

          const [
            { data: profile, error: profileError },
            { data: rows, error: holdingsError },
          ] = await Promise.all([
            supabase
              .from('profiles')
              .select('wallet_balance, balance')
              .eq('id', currentUser.id)
              .maybeSingle(),
            supabase
              .from('user_holdings')
              .select('sym, shares, avg_price')
              .eq('user_id', currentUser.id),
          ]);

          if (profileError) console.error('Profile restore failed:', profileError);
          if (holdingsError) console.error('Holdings restore failed:', holdingsError);

          let holdings = {};

          if (rows?.length) {
            rows.forEach((row) => {
              holdings[row.sym] = {
                sym: row.sym,
                shares: Number(row.shares),
                avgPrice: Number(row.avg_price),
              };
            });

            localStorage.setItem(
              `bullrun_holdings_${currentUser.id}`,
              JSON.stringify(holdings)
            );
          } else {
            try {
              holdings = JSON.parse(
                localStorage.getItem(`bullrun_holdings_${currentUser.id}`) || '{}'
              );
            } catch {
              holdings = {};
            }
          }

          const savedBalance = profile?.wallet_balance ?? profile?.balance;
          let balance = Number(savedBalance);

          if (
            savedBalance === null ||
            savedBalance === undefined ||
            !Number.isFinite(balance)
          ) {
            const cached = localStorage.getItem(`bullrun_wallet_${currentUser.id}`);

            balance =
              cached === null || !Number.isFinite(Number(cached))
                ? START_BALANCE
                : Number(cached);

            const { error } = await supabase
              .from('profiles')
              .update({ wallet_balance: balance, net_worth: balance })
              .eq('id', currentUser.id);

            if (error) console.error('Initial wallet save failed:', error);
          }

          if (!cancelled) {
            setRealHoldings(holdings);
            setRealBalance(balance);

            localStorage.setItem(
              `bullrun_wallet_${currentUser.id}`,
              String(balance)
            );

            await persistPortfolio(currentUser.id, balance, holdings, prices);
          }
        } else {
          setUser(null);

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
    // Prices are intentionally not dependencies here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistPortfolio]);

  const fetchSimulatedPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/historical-prices', {
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
  }, []);

  useEffect(() => {
    fetchSimulatedPrices();

    const timer = setInterval(fetchSimulatedPrices, PRICE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchSimulatedPrices]);

  const getHoldingsValue = useCallback(
    () => calculateHoldingsValue(realHoldings, prices),
    [realHoldings, prices, calculateHoldingsValue]
  );

  useEffect(() => {
    if (!user) return undefined;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistPortfolio(user.id, realBalance, realHoldings, prices);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [realBalance, realHoldings, prices, user, persistPortfolio]);

  const filteredAssets = useMemo(
    () =>
      selectedCategory === 'All Assets'
        ? ASSETS
        : ASSETS.filter((asset) => asset.category === selectedCategory),
    [selectedCategory]
  );

  const activeAsset =
    ASSETS.find((asset) => asset.sym === selectedRealStock) || ASSETS[0];

  const activeQuote = prices[selectedRealStock] || {
    price: 0,
    changePct: 'Loading…',
    history: [],
  };

  const resetOrderDesk = () => {
    setOrderStage('IDLE');
    setPendingOrder(null);
    setExecutedReceipt(null);
  };

  const initiateOrderReview = (type) => {
    if (!marketOpen) {
      alert(
        `The simulated market is closed. Trading hours are Monday to Friday, 9:15 AM to 3:30 PM IST. Current India time: ${indiaTime}.`
      );
      return;
    }

    const price = Number(prices[selectedRealStock]?.price);
    const qty = Number(realQtyInput);

    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Enter a valid quantity greater than zero.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      alert('Price is not available yet.');
      return;
    }

    const total = Number((price * qty).toFixed(2));
    const holding = realHoldings[selectedRealStock];

    if (type === 'BUY' && total > realBalance) {
      alert('Insufficient cash balance.');
      return;
    }

    if (type === 'SELL' && (!holding || qty > holding.shares)) {
      alert('Insufficient shares to sell.');
      return;
    }

    setPendingOrder({
      sym: selectedRealStock,
      name: activeAsset.name,
      type,
      qty,
      price,
      totalCost: total,
    });

    setExecutedReceipt(null);
    setOrderStage('REVIEW');
  };
  const processAndExecuteOrder = async () => {
    if (!pendingOrder || orderStage === 'PROCESSING') return;

    if (!marketOpen) {
      alert('The simulated market is closed. Your order was not executed.');
      resetOrderDesk();
      return;
    }

    setOrderStage('PROCESSING');
    setProcessingStatusText('Validating simulated order...');
    await new Promise((resolve) => setTimeout(resolve, 350));

    setProcessingStatusText('Applying simulated market fill...');
    await new Promise((resolve) => setTimeout(resolve, 350));

    const { sym, type, qty } = pendingOrder;
    const latestPrice = Number(prices[sym]?.price || pendingOrder.price);
    const total = Number((latestPrice * qty).toFixed(2));

    let newBalance = realBalance;
    const holdings = { ...realHoldings };

    if (type === 'BUY') {
      if (newBalance < total) {
        alert('The price changed and your cash balance is now insufficient.');
        resetOrderDesk();
        return;
      }

      newBalance = Number((newBalance - total).toFixed(2));

      const old = holdings[sym];
      const oldShares = Number(old?.shares || 0);
      const shares = Number((oldShares + qty).toFixed(4));

      const average = old
        ? ((Number(old.avgPrice) * oldShares) + latestPrice * qty) / shares
        : latestPrice;

      holdings[sym] = {
        sym,
        shares,
        avgPrice: Number(average.toFixed(2)),
      };
    } else {
      const old = holdings[sym];

      if (!old || Number(old.shares) < qty) {
        alert('Not enough units remain in your portfolio.');
        resetOrderDesk();
        return;
      }

      newBalance = Number((newBalance + total).toFixed(2));

      const remaining = Number((Number(old.shares) - qty).toFixed(4));

      if (remaining <= 0.0001) {
        delete holdings[sym];
      } else {
        holdings[sym] = { ...old, shares: remaining };
      }
    }

    setRealBalance(newBalance);
    setRealHoldings(holdings);

    if (user) {
      localStorage.setItem(`bullrun_wallet_${user.id}`, String(newBalance));
      localStorage.setItem(
        `bullrun_holdings_${user.id}`,
        JSON.stringify(holdings)
      );

      const saveOk = await persistPortfolio(
        user.id,
        newBalance,
        holdings,
        prices
      );

      if (!saveOk) {
        setMarketMessage(
          'Order executed locally, but portfolio saving failed. Check the browser console.'
        );
      }

      if (holdings[sym]) {
        const { error } = await supabase
          .from('user_holdings')
          .upsert(
            {
              user_id: user.id,
              sym,
              shares: holdings[sym].shares,
              avg_price: holdings[sym].avgPrice,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,sym' }
          );

        if (error) console.error('Could not save holding:', error);
      } else {
        const { error } = await supabase
          .from('user_holdings')
          .delete()
          .eq('user_id', user.id)
          .eq('sym', sym);

        if (error) console.error('Could not delete holding:', error);
      }
    } else {
      localStorage.setItem('bullrun_guest_wallet', String(newBalance));
      localStorage.setItem(
        'bullrun_guest_holdings',
        JSON.stringify(holdings)
      );
    }

    setExecutedReceipt({
      orderId: `SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: getIndiaClock(),
      sym,
      type,
      qty,
      price: latestPrice,
      totalCost: total,
      newBalance,
    });

    setOrderStage('SUCCESS');
  };

  const holdingsValue = getHoldingsValue();
  const netWorth = Number((realBalance + holdingsValue).toFixed(2));
  const netReturn = netWorth - START_BALANCE;

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-20 pb-16">
      <Navbar />

      <div className="max-w-[1240px] mx-auto px-4 pt-4 space-y-6">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-[#2b0808] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              <span className="text-[#ff3333]">BULL RUN</span> MULTI-ASSET SIMULATOR
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Practice with generated prices. No live exchange execution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="bg-[#0f0505] border border-[#2b0808] px-3.5 py-2 rounded-xl text-xs">
              <span className="text-slate-500 mr-2">INDIA TIME</span>
              <span className="font-mono font-black text-white tabular-nums">{indiaTime}</span>
            </div>

            <div className={`border px-3.5 py-2 rounded-xl text-xs font-bold ${marketOpen ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
              {marketOpen ? 'SIMULATED MARKET OPEN' : 'SIMULATED MARKET CLOSED'}
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-xs text-amber-200">
          These are illustrative simulated prices and generated chart points, not verified historical exchange data or investment advice.
        </div>

        {marketMessage && (
          <div className="p-3 rounded-xl text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300">
            {marketMessage}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Available Cash', realBalance, 'text-white'],
            ['Holdings Value', holdingsValue, 'text-white'],
            ['Account Net Worth', netWorth, 'text-emerald-400'],
            ['Net Return', netReturn, netReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4">
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
          <aside className="bg-[#0f0505] border border-[#2b0808] rounded-3xl p-4 h-fit">
            <div className="flex justify-between items-center pb-3 border-b border-[#2b0808] text-xs font-black uppercase">
              <span>Asset Watchlist</span>
              <span className="text-[#ff3333]">{filteredAssets.length} assets</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto py-3">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl whitespace-nowrap ${selectedCategory === category ? 'bg-[#ff3333] text-white' : 'bg-[#1a0808] text-slate-400 border border-[#2b0808]'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="divide-y divide-[#2b0808] max-h-[520px] overflow-y-auto">
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
                    className={`w-full p-3 text-left flex justify-between items-center rounded-xl my-1 ${selected ? 'bg-[#1a0808] border border-[#7a0000]' : 'hover:bg-[#1a0808]'}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-black text-sm">{asset.sym}</div>
                      <div className="text-[10px] text-slate-400 truncate">{asset.name}</div>
                      {holding && (
                        <div className="text-[9px] text-emerald-400 mt-1">
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

          <section className="lg:col-span-2 space-y-6">
            <div className="bg-[#0f0505] border border-[#2b0808] p-5 sm:p-6 rounded-3xl">
              {orderStage === 'IDLE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-[10px] uppercase font-black text-[#ff3333]">
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
                      className="w-full border border-[#2b0808] rounded-xl px-4 py-3 text-sm font-mono font-bold bg-[#1a0808] focus:outline-none focus:border-[#7a0000]"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() => initiateOrderReview('BUY')}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs uppercase font-black py-3 rounded-xl"
                      >
                        Buy asset
                      </button>
                      <button
                        onClick={() => initiateOrderReview('SELL')}
                        className="flex-1 bg-rose-700 hover:bg-rose-600 text-white text-xs uppercase font-black py-3 rounded-xl"
                      >
                        Sell asset
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#1a0808] border border-[#2b0808] p-4 rounded-2xl space-y-3 text-xs">
                    <h3 className="font-black uppercase text-slate-400">Asset profile</h3>
                    {[
                      ['Market cap', activeAsset.cap],
                      ['P/E', activeAsset.pe],
                      ['EPS', activeAsset.eps === 'N/A' ? 'N/A' : `₹${activeAsset.eps}`],
                      ['Dividend yield', activeAsset.div],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-[#2b0808] pb-2 last:border-0">
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#1a0808] border border-[#2b0808] p-4 rounded-xl text-xs">
                    <div><span className="block text-slate-400">Units</span><b>{pendingOrder.qty}</b></div>
                    <div><span className="block text-slate-400">Price per unit</span><b>{money(pendingOrder.price)}</b></div>
                    <div><span className="block text-slate-400">Total</span><b className="text-emerald-400">{money(pendingOrder.totalCost)}</b></div>
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
                      className="px-5 bg-[#1a0808] border border-[#2b0808] rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {orderStage === 'PROCESSING' && (
                <div className="py-10 text-center">
                  <div className="animate-spin h-10 w-10 border-4 border-[#ff3333]/20 border-t-[#ff3333] rounded-full mx-auto mb-4" />
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#1a0808] border border-[#2b0808] p-4 rounded-xl text-xs">
                    {[
                      ['Asset / side', `${executedReceipt.sym} / ${executedReceipt.type}`],
                      ['Units', executedReceipt.qty],
                      ['Execution price', money(executedReceipt.price)],
                      ['Settlement total', money(executedReceipt.totalCost)],
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
                    className="bg-[#ff3333] hover:bg-red-700 px-5 py-3 rounded-xl text-xs font-black uppercase"
                  >
                    Done / new order
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#050505] border border-[#2b0808] rounded-3xl overflow-hidden p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <div>
                  <h3 className="font-black text-sm">
                    {selectedRealStock} · Simulated price history
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Generated series · not exchange history
                  </p>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">SIMULATION</span>
              </div>

              <PriceChart
                key={selectedRealStock}
                history={activeQuote.history}
                symbol={selectedRealStock}
              />

              <div className="mt-3 text-[10px] text-slate-500">
                The chart displays generated sample points from the local simulation API. It is not a record of past trading sessions.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
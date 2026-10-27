'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

// ALL SYMBOLS STANDARDIZED TO VERIFIED BSE FEEDS
const STATIC_COMPANY_REGISTRY = [
  // COMMODITIES & METALS
  { sym: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', tv: 'BSE:GOLDBEES', sector: 'Commodities / Gold ETF', category: 'Crypto & ETFs', cap: '₹12.4K Cr', pe: 'N/A', eps: 'N/A', div: '0.00%' },
  { sym: 'SILVERBEES', name: 'Nippon India Silver ETF', tv: 'BSE:SILVERBEES', sector: 'Commodities / Silver ETF', category: 'Crypto & ETFs', cap: '₹3.8K Cr', pe: 'N/A', eps: 'N/A', div: '0.00%' },
  { sym: 'TATASTEEL', name: 'Tata Steel Ltd.', tv: 'BSE:TATASTEEL', sector: 'Metals & Mining', category: 'Crypto & ETFs', cap: '₹1.9L Cr', pe: 42.1, eps: 3.8, div: '2.40%' },
  { sym: 'HINDALCO', name: 'Hindalco Industries Ltd.', tv: 'BSE:HINDALCO', sector: 'Aluminum & Copper', category: 'Crypto & ETFs', cap: '₹1.4L Cr', pe: 14.2, eps: 45.1, div: '0.55%' },
  { sym: 'VEDL', name: 'Vedanta Limited', tv: 'BSE:VEDL', sector: 'Diversified Metals', category: 'Crypto & ETFs', cap: '₹1.6L Cr', pe: 11.5, eps: 38.0, div: '6.50%' },
  { sym: 'COALINDIA', name: 'Coal India Ltd.', tv: 'BSE:COALINDIA', sector: 'Energy & Mining', category: 'Energy & Macro', cap: '₹2.8L Cr', pe: 7.8, eps: 62.4, div: '5.20%' },

  // BANKING & FINANCE
  { sym: 'HDFCBANK', name: 'HDFC Bank Ltd.', tv: 'BSE:HDFCBANK', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹5.9L Cr', pe: 15.8, eps: 49.2, div: '1.66%' },
  { sym: 'ICICIBANK', name: 'ICICI Bank Ltd.', tv: 'BSE:ICICIBANK', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹7.8L Cr', pe: 16.1, eps: 68.2, div: '0.85%' },
  { sym: 'SBIN', name: 'State Bank of India', tv: 'BSE:SBIN', sector: 'Banking & Finance', category: 'Banking & Finance', cap: '₹7.2L Cr', pe: 10.5, eps: 72.0, div: '1.70%' },
  { sym: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', tv: 'BSE:BAJFINANCE', sector: 'NBFC / Lending', category: 'Banking & Finance', cap: '₹3.9L Cr', pe: 26.4, eps: 210.5, div: '0.35%' },

  // TECH & TELECOM
  { sym: 'INFY', name: 'Infosys Ltd.', tv: 'BSE:INFY', sector: 'Information Technology', category: 'Tech & Telecom', cap: '₹4.3L Cr', pe: 14.7, eps: 71.4, div: '4.55%' },
  { sym: 'TCS', name: 'Tata Consultancy Services', tv: 'BSE:TCS', sector: 'Information Technology', category: 'Tech & Telecom', cap: '₹7.8L Cr', pe: 15.8, eps: 136.0, div: '2.33%' },
  { sym: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', tv: 'BSE:BHARTIARTL', sector: 'Telecommunications', category: 'Tech & Telecom', cap: '₹8.1L Cr', pe: 54.0, eps: 24.1, div: '0.60%' },

  // ENERGY & MACRO
  { sym: 'RELIANCE', name: 'Reliance Industries Ltd.', tv: 'BSE:RELIANCE', sector: 'Energy & Retail', category: 'Energy & Macro', cap: '₹17.9L Cr', pe: 37.7, eps: 35.2, div: '0.61%' },
  { sym: 'OIL', name: 'Oil India Limited', tv: 'BSE:OIL', sector: 'Energy & Petroleum', category: 'Energy & Macro', cap: '₹72.4K Cr', pe: 12.1, eps: 42.8, div: '2.80%' },
  { sym: 'NTPC', name: 'NTPC Ltd.', tv: 'BSE:NTPC', sector: 'Utilities & Power', category: 'Energy & Macro', cap: '₹3.7L Cr', pe: 18.2, eps: 21.0, div: '2.10%' },
  { sym: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', tv: 'BSE:ADANIPORTS', sector: 'Infrastructure & Ports', category: 'Energy & Macro', cap: '₹2.9L Cr', pe: 32.4, eps: 38.2, div: '0.50%' },

  // CONSUMER & INDUSTRIALS
  { sym: 'SUNPHARMA', name: 'Sun Pharmaceutical Ind.', tv: 'BSE:SUNPHARMA', sector: 'Pharmaceuticals', category: 'Consumer & Pharma', cap: '₹3.6L Cr', pe: 34.2, eps: 41.0, div: '0.80%' },
  { sym: 'TITAN', name: 'Titan Company Ltd.', tv: 'BSE:TITAN', sector: 'Consumer Durables', category: 'Consumer & Pharma', cap: '₹2.8L Cr', pe: 82.4, eps: 38.5, div: '0.35%' },
  { sym: 'ITC', name: 'ITC Ltd.', tv: 'BSE:ITC', sector: 'FMCG / Consumer', category: 'Consumer & Pharma', cap: '₹5.8L Cr', pe: 28.5, eps: 16.2, div: '3.10%' },
  { sym: 'LT', name: 'Larsen & Toubro Ltd.', tv: 'BSE:LT', sector: 'Engineering & Infrastructure', category: 'Consumer & Pharma', cap: '₹4.9L Cr', pe: 31.2, eps: 92.0, div: '0.80%' },
  { sym: 'MARUTI', name: 'Maruti Suzuki India', tv: 'BSE:MARUTI', sector: 'Automobiles', category: 'Consumer & Pharma', cap: '₹3.8L Cr', pe: 28.4, eps: 412.0, div: '1.00%' }
];

const CATEGORIES_LIST = [
  'All Assets',
  'Crypto & ETFs',
  'Banking & Finance',
  'Tech & Telecom',
  'Energy & Macro',
  'Consumer & Pharma'
];

export default function RealSimulatorPage() {
  const [user, setUser] = useState(null);

  const START_REAL = 50000; 
  const [realBalance, setRealBalance] = useState(START_REAL);
  const [realHoldings, setRealHoldings] = useState({});
  const [selectedRealStock, setSelectedRealStock] = useState('GOLDBEES');
  const [selectedCategory, setSelectedCategory] = useState('All Assets');
  const [realQtyInput, setRealQtyInput] = useState('1');
  const [isChartSyncing, setIsChartSyncing] = useState(false);
  const [marketStatusMessage, setMarketStatusMessage] = useState('');

  const [tvPrices, setTvPrices] = useState({});

  // MULTI-STAGE ORDER EXECUTION FLOW
  const [orderStage, setOrderStage] = useState('IDLE');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [processingStatusText, setProcessingStatusText] = useState('Connecting to Exchange...');
  const [executedReceipt, setExecutedReceipt] = useState(null);

  const chartContainerRef = useRef(null);

  // Sync Supabase session & local storage atomically
  useEffect(() => {
    const syncUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const userId = session.user.id;

          // 1. Fetch balance & holdings from Supabase first
          const { data: prof, error: profError } = await supabase
            .from('profiles')
            .select('wallet_balance, balance, net_worth')
            .eq('id', userId)
            .single();

          let fetchedBalance = null;
          if (prof && !profError) {
            if (prof.wallet_balance !== undefined && prof.wallet_balance !== null) {
              fetchedBalance = Number(prof.wallet_balance);
            } else if (prof.balance !== undefined && prof.balance !== null) {
              fetchedBalance = Number(prof.balance);
            }
          }

          // 2. Fetch user's holdings from database
          const { data: holdingsData } = await supabase
            .from('user_holdings')
            .select('sym, shares, avg_price')
            .eq('user_id', userId);

          let parsedHoldings = {};
          if (holdingsData && holdingsData.length > 0) {
            holdingsData.forEach(h => {
              parsedHoldings[h.sym] = {
                sym: h.sym,
                shares: Number(h.shares),
                avgPrice: Number(h.avg_price)
              };
            });
            setRealHoldings(parsedHoldings);
            localStorage.setItem(`bullrun_holdings_${userId}`, JSON.stringify(parsedHoldings));
          } else {
            // LocalStorage fallback for holdings
            const savedHoldings = localStorage.getItem(`bullrun_holdings_${userId}`);
            if (savedHoldings) {
              parsedHoldings = JSON.parse(savedHoldings);
              setRealHoldings(parsedHoldings);
            }
          }

          // 3. Fallback priority for balance: Supabase -> LocalStorage -> START_REAL (50,000)
          if (fetchedBalance !== null) {
            setRealBalance(fetchedBalance);
            localStorage.setItem(`bullrun_wallet_${userId}`, fetchedBalance.toString());
          } else {
            const cachedWallet = localStorage.getItem(`bullrun_wallet_${userId}`);
            if (cachedWallet !== null) {
              const parsed = parseFloat(cachedWallet);
              setRealBalance(parsed);
              // Save to Supabase to initialize profile column
              await supabase.from('profiles').update({ wallet_balance: parsed }).eq('id', userId);
            } else {
              setRealBalance(START_REAL);
              await supabase.from('profiles').update({ wallet_balance: START_REAL }).eq('id', userId);
            }
          }
        } else {
          // GUEST / UNAUTHENTICATED PERSISTENCE FIX
          const guestWallet = localStorage.getItem('bullrun_guest_wallet');
          const guestHoldings = localStorage.getItem('bullrun_guest_holdings');

          if (guestHoldings) {
            setRealHoldings(JSON.parse(guestHoldings));
          }

          if (guestWallet !== null) {
            setRealBalance(parseFloat(guestWallet));
          } else if (guestHoldings) {
            const parsedGuestHoldings = JSON.parse(guestHoldings);
            const totalSpent = Object.values(parsedGuestHoldings).reduce((sum, h) => sum + (h.avgPrice * h.shares), 0);
            const adjustedWallet = Math.max(0, START_REAL - totalSpent);
            setRealBalance(adjustedWallet);
            localStorage.setItem('bullrun_guest_wallet', adjustedWallet.toString());
          }
        }
      } catch (err) {
        console.error("User session & balance sync error:", err);
      }
    };

    syncUserSession();
  }, []);

  // Fetch live prices via TradingView server proxy
  const fetchTradingViewPrices = useCallback(async () => {
    try {
      const tickers = STATIC_COMPANY_REGISTRY.map(s => s.tv);
      const response = await fetch('/api/tv-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });

      if (response.ok) {
        const json = await response.json();
        const dataRows = json.data || [];
        const updatedPrices = {};

        dataRows.forEach(item => {
          const tvSymbol = item.s;
          const closePrice = item.d?.[0];
          const changePct = item.d?.[1];

          const match = STATIC_COMPANY_REGISTRY.find(s => s.tv === tvSymbol);
          if (match && closePrice !== undefined) {
            const formattedPct = changePct !== undefined 
              ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` 
              : '0.00%';
              
            updatedPrices[match.sym] = {
              price: parseFloat(closePrice.toFixed(2)),
              changePct: formattedPct
            };
          }
        });

        if (Object.keys(updatedPrices).length > 0) {
          setTvPrices(prev => ({ ...prev, ...updatedPrices }));
        }
      }
    } catch (err) {
      console.warn("TradingView price proxy sync error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTradingViewPrices();
    const interval = setInterval(fetchTradingViewPrices, 3000);
    return () => clearInterval(interval);
  }, [fetchTradingViewPrices]);

  // SAFE HOLDINGS VALUE CALCULATOR
  const getRealHoldingsValue = useCallback(() => {
    return Object.values(realHoldings).reduce((sum, h) => {
      const livePrice = tvPrices[h.sym]?.price;
      const validPrice = (livePrice && livePrice > 0) ? livePrice : h.avgPrice;
      return sum + (validPrice * h.shares);
    }, 0);
  }, [realHoldings, tvPrices]);

  // PERIODIC SYNC OF NET WORTH TO SUPABASE FOR LEADERBOARDS
  useEffect(() => {
    if (!user) return;

    const syncNetWorthToSupabase = async () => {
      const holdingsVal = getRealHoldingsValue();
      const calculatedNetWorth = Number((realBalance + holdingsVal).toFixed(2));

      try {
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: realBalance,
            net_worth: calculatedNetWorth 
          })
          .eq('id', user.id);
      } catch (err) {
        console.error("Net worth Leaderboard sync error:", err);
      }
    };

    const debounceTimer = setTimeout(syncNetWorthToSupabase, 2000);
    return () => clearTimeout(debounceTimer);
  }, [realBalance, realHoldings, tvPrices, user, getRealHoldingsValue]);

  // Filter Watchlist Assets by Sector Category
  const filteredAssetsList = useMemo(() => {
    if (selectedCategory === 'All Assets') return STATIC_COMPANY_REGISTRY;
    return STATIC_COMPANY_REGISTRY.filter(a => a.category === selectedCategory);
  }, [selectedCategory]);

  const activeStaticContext = STATIC_COMPANY_REGISTRY.find(x => x.sym === selectedRealStock) || STATIC_COMPANY_REGISTRY[0];
  const activeTvQuote = tvPrices[selectedRealStock] || { price: 0, changePct: 'Syncing...' };

  const mergedActiveRealStock = {
    ...activeStaticContext,
    price: activeTvQuote.price || 0,
    changePct: activeTvQuote.changePct
  };

  const verifyMarketIsActive = () => {
    const indianTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(indianTimeStr);
    
    const dayOfWeek = istDate.getDay(); 
    const currentHour = istDate.getHours();
    const currentMinute = istDate.getMinutes();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    const absoluteMinutes = (currentHour * 60) + currentMinute;
    const sessionOpenMinutes = (9 * 60) + 15;  
    const sessionCloseMinutes = (15 * 60) + 30; 
    
    return absoluteMinutes >= sessionOpenMinutes && absoluteMinutes <= sessionCloseMinutes;
  };

  // Embed TradingView Chart Widget
  useEffect(() => {
    if (!chartContainerRef.current) return;

    setIsChartSyncing(true);
    const scriptId = 'tradingview-advanced-embedded-core';
    let scriptTag = document.getElementById(scriptId);

    const initializeAdvancedChart = () => {
      if (typeof window !== 'undefined' && window.TradingView && chartContainerRef.current) {
        chartContainerRef.current.innerHTML = ''; 

        const viewportId = `tv-view-wrapper-${selectedRealStock}`;
        const targetElement = document.createElement('div');
        targetElement.id = viewportId;
        targetElement.style.height = '100%';
        targetElement.style.width = '100%';
        chartContainerRef.current.appendChild(targetElement);

        new window.TradingView.widget({
          "autosize": true,
          "symbol": mergedActiveRealStock.tv, 
          "interval": "D",
          "timezone": "Asia/Kolkata",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": false,
          "container_id": viewportId,
          "studies": [],
          "showpopupbutton": false,
          "withdateranges": true,
          "hide_legend": false
        });
        setIsChartSyncing(false);
      }
    };

    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.src = 'https://s3.tradingview.com/tv.js';
      scriptTag.type = 'text/javascript';
      scriptTag.async = true;
      scriptTag.onload = () => setTimeout(initializeAdvancedChart, 200);
      document.head.appendChild(scriptTag);
    } else {
      initializeAdvancedChart();
    }
  }, [selectedRealStock, mergedActiveRealStock.tv]);

  // STAGE 1: INITIATE ORDER REVIEW
  const initiateOrderReview = (type) => {
    if (!verifyMarketIsActive()) {
      setMarketStatusMessage("🚨 Order Rejected: Indian Stock & Commodity Exchanges are currently closed. Live trading is permitted Monday to Friday, 9:15 AM – 3:30 PM IST.");
      setTimeout(() => setMarketStatusMessage(''), 8000);
      return;
    }

    const qty = parseFloat(realQtyInput);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid order size.");
      return;
    }

    const livePrice = tvPrices[selectedRealStock]?.price || mergedActiveRealStock.price;
    if (!livePrice || livePrice <= 0) {
      alert("Fetching live TradingView price feed... Please try again in a second.");
      return;
    }

    const totalCost = Number((livePrice * qty).toFixed(2));

    if (type === 'BUY') {
      if (realBalance < totalCost) {
        alert("Insufficient cash balance in your account!");
        return;
      }
    } else {
      const existing = realHoldings[selectedRealStock];
      if (!existing || existing.shares < qty) {
        alert("Not enough units in holdings to execute this sell order!");
        return;
      }
    }

    setPendingOrder({
      sym: selectedRealStock,
      name: mergedActiveRealStock.name,
      type,
      qty,
      price: livePrice,
      totalCost
    });

    setOrderStage('REVIEW');
  };

  // STAGE 2 & 3: CONFIRM & SIMULATE MARKET ROUTING ENGINE
  const processAndExecuteOrder = async () => {
    if (!pendingOrder) return;

    setOrderStage('PROCESSING');
    setProcessingStatusText('Routing order to exchange match engine...');

    await new Promise(r => setTimeout(r, 700));
    setProcessingStatusText('Validating liquidity & verifying margin...');

    await new Promise(r => setTimeout(r, 800));
    setProcessingStatusText('Executing fill at best market rate...');

    await new Promise(r => setTimeout(r, 600));

    // RE-FETCH LATEST LIVE PRICE AT MOMENT OF EXECUTION
    const latestPrice = tvPrices[pendingOrder.sym]?.price || pendingOrder.price;
    const finalTotalCost = Number((latestPrice * pendingOrder.qty).toFixed(2));
    const { sym, type, qty } = pendingOrder;

    let newBalance = realBalance;
    let updatedHoldings = { ...realHoldings };

    if (type === 'BUY') {
      if (realBalance < finalTotalCost) {
        alert("Market price shifted! Insufficient margin to complete order.");
        resetOrderDesk();
        return;
      }

      newBalance = Number((realBalance - finalTotalCost).toFixed(2));
      const existing = updatedHoldings[sym];

      if (existing) {
        const newShares = Number((existing.shares + qty).toFixed(4));
        const newAvg = ((existing.avgPrice * existing.shares) + (latestPrice * qty)) / newShares;
        updatedHoldings[sym] = { sym, shares: newShares, avgPrice: Number(newAvg.toFixed(2)) };
      } else {
        updatedHoldings[sym] = { sym, shares: qty, avgPrice: latestPrice };
      }
    } else {
      const existing = updatedHoldings[sym];
      if (!existing || existing.shares < qty) {
        alert("Execution Error: Insufficient shares in portfolio.");
        resetOrderDesk();
        return;
      }

      newBalance = Number((realBalance + finalTotalCost).toFixed(2));

      const remainingShares = Number((existing.shares - qty).toFixed(4));
      if (remainingShares <= 0.0001) {
        delete updatedHoldings[sym];
      } else {
        updatedHoldings[sym] = { ...existing, shares: remainingShares };
      }
    }

    // UPDATE REACT STATE
    setRealBalance(newBalance);
    setRealHoldings(updatedHoldings);

    // ATOMIC PERSISTENCE FIX: IMMEDIATELY WRITE TO SUPABASE & LOCALSTORAGE
    if (user) {
      const userId = user.id;
      localStorage.setItem(`bullrun_wallet_${userId}`, newBalance.toString());
      localStorage.setItem(`bullrun_holdings_${userId}`, JSON.stringify(updatedHoldings));

      const holdingsVal = Object.values(updatedHoldings).reduce((sum, h) => {
        const livePrice = tvPrices[h.sym]?.price || h.avgPrice;
        return sum + (livePrice * h.shares);
      }, 0);
      const finalNetWorth = Number((newBalance + holdingsVal).toFixed(2));

      try {
        // Immediate balance & net worth write
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: newBalance,
            net_worth: finalNetWorth
          })
          .eq('id', userId);

        // Immediate holding write
        if (type === 'BUY') {
          await supabase
            .from('user_holdings')
            .upsert({
              user_id: userId,
              sym: sym,
              shares: updatedHoldings[sym].shares,
              avg_price: updatedHoldings[sym].avgPrice,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,sym' });
        } else {
          if (updatedHoldings[sym]) {
            await supabase
              .from('user_holdings')
              .update({
                shares: updatedHoldings[sym].shares,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('sym', sym);
          } else {
            await supabase
              .from('user_holdings')
              .delete()
              .eq('user_id', userId)
              .eq('sym', sym);
          }
        }
      } catch (dbErr) {
        console.error("Direct Supabase trade persistence error:", dbErr);
      }
    } else {
      // GUEST MODE LOCAL STORAGE PERSISTENCE
      localStorage.setItem('bullrun_guest_wallet', newBalance.toString());
      localStorage.setItem('bullrun_guest_holdings', JSON.stringify(updatedHoldings));
    }

    const receipt = {
      orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sym,
      type,
      qty,
      price: latestPrice,
      totalCost: finalTotalCost,
      newBalance
    };

    setExecutedReceipt(receipt);
    setOrderStage('SUCCESS');
  };

  const resetOrderDesk = () => {
    setOrderStage('IDLE');
    setPendingOrder(null);
    setExecutedReceipt(null);
  };

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-20 pb-16">
      <Navbar />

      <div className="max-w-[1240px] mx-auto px-4 pt-4 space-y-6">
        <div className="space-y-6 animate-fadeInFast">
          
          {/* TOP HEADER */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-[#2b0808] pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-[#ff3333]">PRO</span> MULTI-ASSET SIMULATOR
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Equities, Gold/Silver ETFs & Commodities synchronized live with Supabase Leaderboards.</p>
            </div>
            <div className="flex items-center gap-2 bg-[#1a0808] border border-[#2b0808] px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 font-mono shadow-sm w-fit">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Execution Desk Active
            </div>
          </div>

          {marketStatusMessage && (
            <div className="p-4 rounded-xl font-bold text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300 animate-fadeIn shadow-sm">
              {marketStatusMessage}
            </div>
          )}

          {/* PORTFOLIO METRICS SHEET */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl hover:border-[#7a0000] transition-colors">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Available Cash Balance</span>
              <div className="text-lg font-black mt-1 font-mono text-white">₹{Math.round(realBalance).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl hover:border-[#7a0000] transition-colors">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Holdings Portfolio Value</span>
              <div className="text-lg font-black mt-1 font-mono text-white">₹{Math.round(getRealHoldingsValue()).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl hover:border-[#7a0000] transition-colors">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Total Account Net Worth</span>
              <div className="text-lg font-black mt-1 font-mono text-emerald-400">₹{Math.round(realBalance + getRealHoldingsValue()).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl hover:border-[#7a0000] transition-colors">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Net Margin Return</span>
              <div className={`text-lg font-black mt-1 font-mono ${(realBalance + getRealHoldingsValue() - START_REAL) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                ₹{Math.round(realBalance + getRealHoldingsValue() - START_REAL).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SECTOR CATEGORIZED WATCHLIST */}
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-3xl overflow-hidden shadow-2xl h-fit space-y-3 p-4">
              
              <div className="font-black text-xs uppercase tracking-wider text-slate-300 pb-2 border-b border-[#2b0808] flex items-center justify-between">
                <span>Asset Sector Watchlist</span>
                <span className="text-[10px] text-[#ff3333] font-mono">{filteredAssetsList.length} Items</span>
              </div>

              {/* SECTOR CATEGORY PILLS */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES_LIST.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#ff3333] text-white shadow-md' : 'bg-[#1a0808] text-slate-400 hover:text-white border border-[#2b0808]'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* ASSETS LIST */}
              <div className="divide-y divide-[#2b0808] max-h-[480px] overflow-y-auto pr-1">
                {filteredAssetsList.map(s => {
                  const priceObj = tvPrices[s.sym] || { price: 0, changePct: 'Syncing...' };
                  const hold = realHoldings[s.sym];
                  const isSelected = selectedRealStock === s.sym;

                  return (
                    <button 
                      key={s.sym}
                      onClick={() => {
                        setSelectedRealStock(s.sym);
                        if (orderStage !== 'IDLE') resetOrderDesk();
                      }}
                      className={`w-full p-3 text-left flex justify-between items-center transition-all rounded-2xl my-1 hover:bg-[#1a0808] ${isSelected ? 'bg-[#1a0808] border border-[#7a0000] shadow-lg' : ''}`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-black text-sm text-white flex items-center gap-1.5">
                          {s.sym}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium max-w-[130px] truncate">{s.name}</div>
                        <span className="text-[9px] text-[#ff3333] font-bold block">{s.sector}</span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-white">
                          {priceObj.price > 0 ? `₹${priceObj.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Syncing...'}
                        </div>
                        <div className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg inline-block mt-0.5 ${priceObj.changePct.startsWith('-') ? 'text-rose-400 bg-rose-950/40' : 'text-emerald-400 bg-emerald-950/40'}`}>
                          {priceObj.changePct}
                        </div>
                        {hold && <div className="text-[9px] text-emerald-400 font-black mt-1">Owned: {hold.shares} Units</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE ORDER WORK DESK & CHART */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* REALISTIC MULTI-STAGE ORDER PANEL */}
              <div className="bg-[#0f0505] border border-[#2b0808] p-6 rounded-3xl shadow-2xl transition-all min-h-[260px] flex flex-col justify-between">
                
                {/* STAGE 1: ORDER INPUT */}
                {orderStage === 'IDLE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-black text-[#ff3333] bg-[#1a0808] border border-[#2b0808] px-2.5 py-1 rounded-md tracking-wider">
                          {mergedActiveRealStock.sector}
                        </span>
                        <h2 className="text-xl font-black text-white mt-2.5">{mergedActiveRealStock.name}</h2>
                        <div className="text-2xl font-black font-mono text-white mt-1">
                          {mergedActiveRealStock.price > 0 
                            ? `₹${mergedActiveRealStock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                            : 'Syncing Price...'}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Order Size / Units</label>
                        <input 
                          type="number"
                          step="any"
                          min="0.001"
                          value={realQtyInput}
                          onChange={e => setRealQtyInput(e.target.value)}
                          className="w-full border border-[#2b0808] rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#7a0000] bg-[#1a0808]"
                        />
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button 
                          onClick={() => initiateOrderReview('BUY')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase font-black tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Buy Asset
                        </button>
                        <button 
                          onClick={() => initiateOrderReview('SELL')}
                          className="flex-1 bg-rose-700 hover:bg-rose-800 text-white text-xs uppercase font-black tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Sell Asset
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#1a0808] border border-[#2b0808] p-4 rounded-2xl space-y-2.5 text-xs">
                      <h3 className="font-black uppercase text-slate-400 tracking-wider text-[10px]">Asset Valuation Profile</h3>
                      <div className="flex justify-between border-b border-[#2b0808] pb-2">
                        <span className="text-slate-400">Market Cap:</span>
                        <span className="font-bold text-white">{mergedActiveRealStock.cap}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#2b0808] pb-2">
                        <span className="text-slate-400">P/E Margin:</span>
                        <span className="font-bold font-mono text-white">{mergedActiveRealStock.pe}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#2b0808] pb-2">
                        <span className="text-slate-400">EPS Yield:</span>
                        <span className="font-bold font-mono text-white">{mergedActiveRealStock.eps === 'N/A' ? 'N/A' : `₹${mergedActiveRealStock.eps}`}</span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-slate-400">Yield Div:</span>
                        <span className="font-bold text-white">{mergedActiveRealStock.div}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 2: ORDER REVIEW & CONFIRMATION */}
                {orderStage === 'REVIEW' && pendingOrder && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-[#2b0808] pb-3">
                      <div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${pendingOrder.type === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                          {pendingOrder.type} ORDER TICKET
                        </span>
                        <h2 className="text-lg font-black text-white mt-1">{pendingOrder.name} ({pendingOrder.sym})</h2>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-black">Exchange Routing</div>
                        <div className="text-xs font-bold text-white font-mono">BSE Spot Regular</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1a0808] border border-[#2b0808] p-3.5 rounded-xl text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Order Type</span>
                        <span className="font-bold text-white">Market Order</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Order Size</span>
                        <span className="font-bold text-white">{pendingOrder.qty} Units</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Execution Rate</span>
                        <span className="font-bold text-white">₹{pendingOrder.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Estimated Total</span>
                        <span className="font-bold text-emerald-400">₹{pendingOrder.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button 
                        onClick={processAndExecuteOrder}
                        className={`flex-1 ${pendingOrder.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-700 hover:bg-rose-800'} text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer`}
                      >
                        Submit Order to Market
                      </button>
                      <button 
                        onClick={resetOrderDesk}
                        className="bg-[#1a0808] hover:bg-[#2b0808] border border-[#2b0808] text-slate-300 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel Ticket
                      </button>
                    </div>
                  </div>
                )}

                {/* STAGE 3: ORDER PROCESSING & ROUTING */}
                {orderStage === 'PROCESSING' && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fadeIn">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full border-4 border-[#ff3333]/20 border-t-[#ff3333] animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#ff3333]">⚡</div>
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="font-black text-sm text-white">{processingStatusText}</h3>
                      <p className="text-slate-400 text-xs">Communicating with exchange Liquidity Providers...</p>
                    </div>
                  </div>
                )}

                {/* STAGE 4: EXECUTION CONFIRMATION & RECEIPT */}
                {orderStage === 'SUCCESS' && executedReceipt && (
                  <div className="space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-900/60 p-3.5 rounded-xl text-emerald-300 text-xs">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        Order Successfully Executed & Settled
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400">{executedReceipt.orderId}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1a0808] border border-[#2b0808] p-4 rounded-xl text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Filled Asset</span>
                        <span className="font-bold text-white">{executedReceipt.sym} ({executedReceipt.type})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Filled Size</span>
                        <span className="font-bold text-white">{executedReceipt.qty} Units</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Execution Rate</span>
                        <span className="font-bold text-white">₹{executedReceipt.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Total Settlement</span>
                        <span className="font-bold text-emerald-400">₹{executedReceipt.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-slate-400">Asset units have been credited to your portfolio.</span>
                      <button 
                        onClick={resetOrderDesk}
                        className="bg-[#ff3333] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Done / Place Another Order
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* TRADINGVIEW CONTAINER */}
              <div className="bg-[#000000] border border-[#2b0808] rounded-3xl overflow-hidden shadow-2xl relative h-[420px] w-full">
                {isChartSyncing && (
                  <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center text-xs font-bold text-[#ff3333] animate-pulse">
                    ⚡ Syncing TradingView Data Feeds...
                  </div>
                )}
                <div ref={chartContainerRef} className="w-full h-full" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
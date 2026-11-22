// lib/catalog.js
// Every tradable (and view-only) asset in the simulator. ALL names are invented.
// None of these companies, currencies, commodities brands or indices exist.
// Pure data, no imports, safe on the server and in the browser.
// sym    = short code (never change a code that users already own)
// base   = starting price in rupees; the price walk moves around it
// vol    = movement per 15-second tick (higher = more movement)
// liq    = liquidity (used later for slippage): high, mid or low

const R = '\u20B9';
const sig = (dailyPct) => Number((dailyPct * 0.0889).toFixed(5)); // daily % -> tick size

export const CATEGORIES = [
  'Commodities',
  'Currency',
  'Indices',
  'ETFs',
  'Banking & NBFC',
  'IT',
  'Energy & Power',
  'Metals & Mining',
  'Pharma & Health',
  'FMCG & Consumer',
  'Auto',
  'Infra & Industrials',
  'Telecom & Media',
];

function asset(sym, name, sector, category, cls, base, vol, liq, cap, pe, eps, div, extra = {}) {
  return {
    sym, name, sector, category, cls, base, vol, liq,
    cap, pe, eps, div,
    tradable: cls !== 'index',
    ...extra,
  };
}

const NA = 'N/A';
const E = 'equity';

export const ASSETS = [
  // ---- Commodities (8) ----
  asset('GOLDVLT', 'Gold Vault ETF', 'Commodities / Gold', 'Commodities', 'commodity', 72, 0.0008, 'high', R + '12.4K Cr', NA, NA, '0.00%'),
  asset('SILVRVLT', 'Silver Vault ETF', 'Commodities / Silver', 'Commodities', 'commodity', 95, 0.0012, 'high', R + '3.8K Cr', NA, NA, '0.00%'),
  asset('DARKCRUDE', 'Darkwater Crude Oil', 'Commodities / Energy', 'Commodities', 'commodity', 640, sig(0.018), 'high', NA, NA, NA, '0.00%'),
  asset('EMBERGAS', 'Emberflow Natural Gas', 'Commodities / Energy', 'Commodities', 'commodity', 215, sig(0.02), 'mid', NA, NA, NA, '0.00%'),
  asset('REDMOOR', 'Redmoor Copper', 'Commodities / Base metal', 'Commodities', 'commodity', 880, sig(0.014), 'mid', NA, NA, NA, '0.00%'),
  asset('ZINCARA', 'Zincara Zinc', 'Commodities / Base metal', 'Commodities', 'commodity', 265, sig(0.013), 'mid', NA, NA, NA, '0.00%'),
  asset('FEATHRALU', 'Featherlite Aluminium', 'Commodities / Base metal', 'Commodities', 'commodity', 240, sig(0.012), 'mid', NA, NA, NA, '0.00%'),
  asset('CLOUDCOT', 'Cloudfield Cotton', 'Commodities / Farm', 'Commodities', 'commodity', 58, sig(0.011), 'low', NA, NA, NA, '0.00%'),

  // ---- Currency pairs (6) - invented currencies, priced in rupees ----
  asset('KESTMARK', 'Kestrel Mark / Bull Rupee', 'Currency pair', 'Currency', 'currency', 92.4, sig(0.0025), 'high', NA, NA, NA, '0.00%'),
  asset('SOLDINAR', 'Solari Dinar / Bull Rupee', 'Currency pair', 'Currency', 'currency', 268.3, sig(0.0025), 'high', NA, NA, NA, '0.00%'),
  asset('TAMAPESO', 'Tamarin Peso / Bull Rupee', 'Currency pair', 'Currency', 'currency', 14.85, sig(0.0025), 'mid', NA, NA, NA, '0.00%'),
  asset('VELMPND', 'Velmora Pound / Bull Rupee', 'Currency pair', 'Currency', 'currency', 108.6, sig(0.0025), 'high', NA, NA, NA, '0.00%'),
  asset('ORLNSEN', 'Orlin Sen (per 100) / Bull Rupee', 'Currency pair', 'Currency', 'currency', 58.2, sig(0.0025), 'mid', NA, NA, NA, '0.00%'),
  asset('ZEPHFRNC', 'Zephyr Franc / Bull Rupee', 'Currency pair', 'Currency', 'currency', 96.2, sig(0.0025), 'high', NA, NA, NA, '0.00%'),

  // ---- Indices (6, view only, weighted baskets of the stocks below) ----
  asset('BR50', 'Bull Run 50 Index', 'Index / Broad market', 'Indices', 'index', 10000, 0, 'high', NA, NA, NA, NA, { basket: [['PRIMEBANK', 8], ['UNITYBANK', 7], ['NATBANK', 6], ['INFOSPHR', 7], ['TECHNOVA', 8], ['ENERGIA', 10], ['PETROFLD', 4], ['SKYLINK', 6], ['CONSUMEX', 6], ['VITACURE', 5], ['MOTORIA', 6], ['BUILDCRP', 5], ['IRONWORKS', 4], ['VOLTARA', 4], ['HEALWELL', 4], ['FRSHHRVT', 4], ['VOLTRIDE', 3], ['STNBRDGE', 3]] }),
  asset('BRBANK', 'Bull Run Bank Index', 'Index / Banking', 'Indices', 'index', 8000, 0, 'high', NA, NA, NA, NA, { basket: [['PRIMEBANK', 30], ['UNITYBANK', 28], ['NATBANK', 22], ['CREDITO', 12], ['NORTHGBK', 8]] }),
  asset('BRTECH', 'Bull Run Tech Index', 'Index / IT', 'Indices', 'index', 6000, 0, 'high', NA, NA, NA, NA, { basket: [['INFOSPHR', 28], ['TECHNOVA', 32], ['QWEAVE', 14], ['BYTEFLD', 12], ['CLDMANTL', 14]] }),
  asset('BRAUTO', 'Bull Run Auto Index', 'Index / Auto', 'Indices', 'index', 5000, 0, 'high', NA, NA, NA, NA, { basket: [['MOTORIA', 40], ['VOLTRIDE', 15], ['TORQMAX', 20], ['WHLHOUSE', 13], ['ROADKNG', 12]] }),
  asset('BRPHARMA', 'Bull Run Pharma Index', 'Index / Pharma', 'Indices', 'index', 7000, 0, 'mid', NA, NA, NA, NA, { basket: [['VITACURE', 30], ['HEALWELL', 22], ['ZENACURE', 20], ['MEDORAH', 16], ['PILLARGX', 12]] }),
  asset('BRENERGY', 'Bull Run Energy Index', 'Index / Energy', 'Indices', 'index', 9000, 0, 'high', NA, NA, NA, NA, { basket: [['ENERGIA', 30], ['PETROFLD', 14], ['VOLTARA', 16], ['SOLRWND', 14], ['GRIDMRK', 12], ['BLAZFLD', 14]] }),

  // ---- ETFs / funds (6): each follows an index basket ----
  asset('BR50ETF', 'Bull Run 50 Fund', 'Fund / Broad market', 'ETFs', 'etf', 250, 0, 'high', R + '9.1K Cr', NA, NA, '0.90%', { tracks: 'BR50' }),
  asset('BRBNKETF', 'Bull Run Bank Fund', 'Fund / Banking', 'ETFs', 'etf', 410, 0, 'high', R + '4.2K Cr', NA, NA, '0.70%', { tracks: 'BRBANK' }),
  asset('BRTECHETF', 'Bull Run Tech Fund', 'Fund / IT', 'ETFs', 'etf', 360, 0, 'mid', R + '2.7K Cr', NA, NA, '1.10%', { tracks: 'BRTECH' }),
  asset('BRAUTOETF', 'Bull Run Auto Fund', 'Fund / Auto', 'ETFs', 'etf', 185, 0, 'mid', R + '1.3K Cr', NA, NA, '0.60%', { tracks: 'BRAUTO' }),
  asset('BRPHRMETF', 'Bull Run Pharma Fund', 'Fund / Pharma', 'ETFs', 'etf', 120, 0, 'mid', R + '900 Cr', NA, NA, '0.50%', { tracks: 'BRPHARMA' }),
  asset('BRENGYETF', 'Bull Run Energy Fund', 'Fund / Energy', 'ETFs', 'etf', 95, 0, 'mid', R + '1.1K Cr', NA, NA, '1.30%', { tracks: 'BRENERGY' }),

  // ---- Banking & NBFC (5) ----
  asset('PRIMEBANK', 'Prime Bank Ltd.', 'Banking', 'Banking & NBFC', E, 980, 0.0014, 'high', R + '5.9L Cr', '15.8', '49.2', '1.66%'),
  asset('UNITYBANK', 'Unity Bank Ltd.', 'Banking', 'Banking & NBFC', E, 1400, 0.0015, 'high', R + '7.8L Cr', '16.1', '68.2', '0.85%'),
  asset('NATBANK', 'National Savings Bank', 'Banking', 'Banking & NBFC', E, 850, 0.0014, 'high', R + '7.2L Cr', '10.5', '72.0', '1.70%'),
  asset('CREDITO', 'Credito Finance Ltd.', 'NBFC / Lending', 'Banking & NBFC', E, 1050, 0.0018, 'mid', R + '3.9L Cr', '26.4', '210.5', '0.35%'),
  asset('NORTHGBK', 'Northgate Mutual Bank', 'Banking', 'Banking & NBFC', E, 620, sig(0.016), 'mid', R + '1.8L Cr', '12.9', '48.1', '1.20%'),

  // ---- IT (5) ----
  asset('INFOSPHR', 'Infosphere Ltd.', 'Information Technology', 'IT', E, 1500, 0.0016, 'high', R + '4.3L Cr', '14.7', '71.4', '4.55%'),
  asset('TECHNOVA', 'Technova Consulting Services', 'Information Technology', 'IT', E, 3200, 0.0017, 'high', R + '7.8L Cr', '15.8', '136.0', '2.33%'),
  asset('QWEAVE', 'Quantaweave Systems Ltd.', 'Information Technology', 'IT', E, 2100, sig(0.017), 'mid', R + '1.2L Cr', '28.5', '73.7', '1.10%'),
  asset('BYTEFLD', 'Bytefield Digital Ltd.', 'Information Technology', 'IT', E, 850, sig(0.02), 'mid', R + '48K Cr', '34.2', '24.9', '0.40%'),
  asset('CLDMANTL', 'Cloudmantle Software Ltd.', 'Information Technology', 'IT', E, 1250, sig(0.019), 'mid', R + '66K Cr', '41.0', '30.5', '0.00%'),

  // ---- Energy & Power (6) ----
  asset('ENERGIA', 'Energia Industries Ltd.', 'Energy & Retail', 'Energy & Power', E, 1400, 0.0016, 'high', R + '17.9L Cr', '37.7', '35.2', '0.61%'),
  asset('PETROFLD', 'Petrofield Oil Ltd.', 'Energy & Petroleum', 'Energy & Power', E, 400, 0.002, 'mid', R + '72.4K Cr', '12.1', '42.8', '2.80%'),
  asset('VOLTARA', 'Voltara Power Ltd.', 'Utilities & Power', 'Energy & Power', E, 350, 0.0013, 'high', R + '3.7L Cr', '18.2', '21.0', '2.10%'),
  asset('SOLRWND', 'Solarwind Renewables Ltd.', 'Renewable Energy', 'Energy & Power', E, 310, sig(0.021), 'mid', R + '58K Cr', '46.0', '6.7', '0.00%'),
  asset('GRIDMRK', 'Gridmark Transmission Ltd.', 'Power Transmission', 'Energy & Power', E, 275, sig(0.015), 'mid', R + '1.9L Cr', '19.5', '14.1', '3.20%'),
  asset('BLAZFLD', 'Blazefield Gas Corp.', 'Gas Distribution', 'Energy & Power', E, 540, sig(0.017), 'mid', R + '77K Cr', '16.8', '32.1', '2.40%'),

  // ---- Metals & Mining (5) ----
  asset('IRONWORKS', 'Ironworks Steel Ltd.', 'Steel', 'Metals & Mining', E, 165, 0.0018, 'high', R + '1.9L Cr', '42.1', '3.8', '2.40%'),
  asset('ALUMINA', 'Alumina Metals Ltd.', 'Aluminium & Copper', 'Metals & Mining', E, 780, 0.0016, 'mid', R + '1.4L Cr', '14.2', '45.1', '0.55%'),
  asset('TERRAMIN', 'Terra Minerals Ltd.', 'Diversified Metals', 'Metals & Mining', E, 460, 0.0018, 'mid', R + '1.6L Cr', '11.5', '38.0', '6.50%'),
  asset('CARBONIA', 'Carbonia Coal Ltd.', 'Coal & Mining', 'Metals & Mining', E, 390, 0.002, 'mid', R + '2.8L Cr', '7.8', '62.4', '5.20%'),
  asset('CPRFALL', 'Copperfall Resources Ltd.', 'Base Metals', 'Metals & Mining', E, 690, sig(0.02), 'mid', R + '54K Cr', '13.4', '51.5', '1.80%'),

  // ---- Pharma & Health (5) ----
  asset('VITACURE', 'Vitacure Pharma Ltd.', 'Pharmaceuticals', 'Pharma & Health', E, 1700, 0.0016, 'high', R + '3.6L Cr', '34.2', '41.0', '0.80%'),
  asset('HEALWELL', 'Healwell Laboratories Ltd.', 'Pharmaceuticals', 'Pharma & Health', E, 1150, sig(0.016), 'mid', R + '1.4L Cr', '29.8', '38.6', '0.90%'),
  asset('ZENACURE', 'Zenacure Biotech Ltd.', 'Biotechnology', 'Pharma & Health', E, 2400, sig(0.022), 'low', R + '62K Cr', '58.0', '41.4', '0.00%'),
  asset('MEDORAH', 'Medora Hospitals Ltd.', 'Hospitals', 'Pharma & Health', E, 4100, sig(0.015), 'mid', R + '1.1L Cr', '52.3', '78.4', '0.20%'),
  asset('PILLARGX', 'Pillar Generics Ltd.', 'Generic Medicines', 'Pharma & Health', E, 780, sig(0.018), 'mid', R + '41K Cr', '22.6', '34.5', '1.50%'),

  // ---- FMCG & Consumer (5) ----
  asset('CONSUMEX', 'Consumex Goods Ltd.', 'FMCG / Consumer', 'FMCG & Consumer', E, 400, 0.0012, 'high', R + '5.8L Cr', '28.5', '16.2', '3.10%'),
  asset('AURUM', 'Aurum Timepieces Ltd.', 'Consumer Durables', 'FMCG & Consumer', E, 3500, 0.0022, 'mid', R + '2.8L Cr', '82.4', '38.5', '0.35%'),
  asset('FRSHHRVT', 'Freshharvest Foods Ltd.', 'Packaged Food', 'FMCG & Consumer', E, 2300, sig(0.012), 'high', R + '2.2L Cr', '47.0', '48.9', '1.30%'),
  asset('SILKRD', 'Silkroad Apparel Ltd.', 'Apparel & Retail', 'FMCG & Consumer', E, 1250, sig(0.018), 'mid', R + '70K Cr', '55.2', '22.6', '0.50%'),
  asset('GLOWBRT', 'Glowbright Personal Care Ltd.', 'Personal Care', 'FMCG & Consumer', E, 1750, sig(0.013), 'high', R + '1.6L Cr', '51.0', '34.3', '1.60%'),

  // ---- Auto (5) ----
  asset('MOTORIA', 'Motoria Autos India', 'Automobiles', 'Auto', E, 12500, 0.002, 'high', R + '3.8L Cr', '28.4', '412.0', '1.00%'),
  asset('VOLTRIDE', 'Voltride Electric Vehicles Ltd.', 'Electric Vehicles', 'Auto', E, 950, sig(0.022), 'mid', R + '75K Cr', '64.0', '14.8', '0.00%'),
  asset('TORQMAX', 'Torquemax Tractors Ltd.', 'Tractors & Farm Equipment', 'Auto', E, 2750, sig(0.015), 'mid', R + '1.0L Cr', '24.1', '114.1', '1.40%'),
  asset('WHLHOUSE', 'Wheelhouse Components Ltd.', 'Auto Parts', 'Auto', E, 1450, sig(0.017), 'mid', R + '52K Cr', '27.7', '52.3', '0.80%'),
  asset('ROADKNG', 'Roadking Trucks Ltd.', 'Commercial Vehicles', 'Auto', E, 1100, sig(0.018), 'mid', R + '88K Cr', '19.2', '57.3', '2.00%'),

  // ---- Infra & Industrials (5) ----
  asset('HARBORLN', 'Harborline Ports Ltd.', 'Infrastructure & Ports', 'Infra & Industrials', E, 1400, 0.0016, 'mid', R + '2.9L Cr', '32.4', '38.2', '0.50%'),
  asset('BUILDCRP', 'Buildcorp Engineering Ltd.', 'Engineering & Infrastructure', 'Infra & Industrials', E, 3500, 0.0018, 'high', R + '4.9L Cr', '31.2', '92.0', '0.80%'),
  asset('STNBRDGE', 'Stonebridge Cement Ltd.', 'Cement', 'Infra & Industrials', E, 1900, sig(0.014), 'mid', R + '1.1L Cr', '36.5', '52.1', '0.60%'),
  asset('IRONCLAD', 'Ironclad Construction Ltd.', 'Construction', 'Infra & Industrials', E, 2600, sig(0.017), 'mid', R + '82K Cr', '23.8', '109.2', '1.00%'),
  asset('SKYRAIL', 'Skyrail Logistics Ltd.', 'Logistics & Rail', 'Infra & Industrials', E, 820, sig(0.019), 'mid', R + '44K Cr', '30.1', '27.2', '0.90%'),

  // ---- Telecom & Media (4) ----
  asset('SKYLINK', 'Skylink Telecom Ltd.', 'Telecommunications', 'Telecom & Media', E, 1900, 0.0018, 'high', R + '8.1L Cr', '54.0', '24.1', '0.60%'),
  asset('BRTWAVE', 'Brightwave Broadcasting Ltd.', 'Broadcasting', 'Telecom & Media', E, 540, sig(0.018), 'mid', R + '38K Cr', '21.3', '25.4', '1.10%'),
  asset('STRMLGHT', 'Streamlight Media Ltd.', 'Streaming & Media', 'Telecom & Media', E, 330, sig(0.022), 'mid', R + '29K Cr', '60.5', '5.5', '0.00%'),
  asset('TOWRLINE', 'Towerline Networks Ltd.', 'Telecom Infrastructure', 'Telecom & Media', E, 220, sig(0.017), 'mid', R + '61K Cr', '25.9', '8.5', '1.50%'),
];

export const ASSET_BY_SYM = Object.fromEntries(ASSETS.map((a) => [a.sym, a]));

export function assetClassOf(sym) {
  return ASSET_BY_SYM[sym]?.cls || 'equity';
}

export function isTradable(sym) {
  return Boolean(ASSET_BY_SYM[sym]?.tradable);
}
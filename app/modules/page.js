import fs from 'fs';
import path from 'path';
import Navbar from '@/components/Navbar';
import InteractiveCourseWrapper from './InteractiveCourseWrapper';

// Define the 4 Main Level Tracks
const TRACK_DEFINITIONS = [
  {
    id: "track-1",
    trackNumber: 1,
    level: "Level 1: Beginner Business Architect",
    title: "Stock Market Fundamentals & Business Mechanics",
    description: "Discover how businesses start, earn revenue, calculate profit, divide equity into shares, and raise capital to expand."
  },
  {
    id: "track-2",
    trackNumber: 2,
    level: "Level 2: Market Strategist",
    title: "Market Dynamics, Indices & Portfolio Architecture",
    description: "Master market cycles, Bull & Bear trends, Nifty 50 benchmarks, risk diversification, and financial statements."
  },
  {
    id: "track-3",
    trackNumber: 3,
    level: "Level 3: Technical Analyst & Trader",
    title: "Technical Analysis, Candlesticks & Strategy Execution",
    description: "Master price action charts, Japanese Candlesticks (OHLC), support & resistance zones, and risk management."
  },
  {
    id: "track-4",
    trackNumber: 4,
    level: "Level 4: Master Investor",
    title: "Funds, Macroeconomics & Advanced Execution",
    description: "Master Mutual Funds, ETFs, Corporate Bonds, Order Types (Market vs Limit), and research frameworks."
  },
  {
    id: "track-5",
    trackNumber: 5,
    level: "Level 5: Financial Guru",
    title: "Advanced Portfolio Architecture, Valuation & Risk Engineering",
    description: "Master complex portfolio strategies, market leadership techniques, and advanced financial modeling."
  }
];

function getAllModulesData() {
  const dataDir = path.join(process.cwd(), 'app', 'data');

  // Map each Track to its exact corresponding file (Track 1 -> Mod_1.txt, Track 2 -> Mod_2.txt, etc.)
  return TRACK_DEFINITIONS.map((trackDef, index) => {
    const fileNumber = index + 1;
    const fileName = `Mod_${fileNumber}.txt`;
    const filePath = path.join(dataDir, fileName);
    const trackModules = [];

    if (fs.existsSync(filePath)) {
      try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const parsedModule = JSON.parse(fileContents);
        
        if (Array.isArray(parsedModule)) {
          trackModules.push(...parsedModule);
        } else {
          trackModules.push(parsedModule);
        }
      } catch (error) {
        console.error(`Error reading or parsing ${fileName}:`, error);
      }
    }

    return {
      ...trackDef,
      modules: trackModules
    };
  });
}

export default function ModulesPage() {
  const initialTracks = getAllModulesData();

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="space-y-2 mb-10 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 bg-bull-raised border border-bull-line text-bull-lime text-[10px] uppercase tracking-widest font-black px-3.5 py-1 rounded-full shadow-inner mb-2 font-mono">
            🎓 Bull Run Academy
          </span>
          <h1 className="font-poppins font-black text-3xl sm:text-4xl text-white tracking-tight">
            Interactive Learning Arena
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl font-medium">
            Select a target track card. Complete modules and submodules sequentially to earn XP and unlock advanced trading systems.
          </p>
        </div>

        {/* Dynamic client wrapper */}
        <InteractiveCourseWrapper initialTracks={initialTracks} />
      </div>
    </main>
  );
}
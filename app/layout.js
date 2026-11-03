import ActivityTracker from '@/components/ActivityTracker';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TOTAL REWRITTEN METADATA AND SEO CONFIGURATION
export const metadata = {
  title: {
    default: "Bull Run | Premium Stock Market Sandbox Arena",
    template: "%s | Bull Run"
  },
  description: "Practice paper trading risk-free with live NSE market feeds, join custom classroom trading tournaments, and climb the standings leaderboard.",
  keywords: [
    // Core Simulator & Paper Trading Phrases
    "stock market simulator", 
    "paper trading India", 
    "NSE simulator", 
    "virtual stock trading app",
    "free portfolio tracker mock",
    "nifty 50 simulator game",
    "learn trading risk free",
    "live market data sandbox",
    "virtual stock market platform",
    
    // Quiz & Gamification Terms
    "finance mock quiz", 
    "classroom trading game", 
    "Bull Run sandbox",
    "financial intelligence battleground",
    "stock market game for schools",
    "daily finance mcq challenge",
    "bazaar bucks leaderboard",
    
    // Indian Market Specifics (High Volume)
    "nse bse virtual trading",
    "practice intra day trading free",
    "indian stock market game for students",
    "fno simulation sandbox india",
    "share market learning app free"
  ],
  authors: [{ name: "Vikrant Chipkar" }],
  metadataBase: new URL("https://bullrun-arena.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bull Run | Classroom Stock Market Sandbox Arena",
    description: "Practice paper trading risk-free with live market data feeds and competitive leaderboards.",
    url: "https://bullrun-arena.vercel.app",
    siteName: "Bull Run",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bull Run | Stock Market Sandbox Arena",
    description: "Practice paper trading risk-free with live market data feeds.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // GOOGLE VERIFICATION CODE
  verification: {
    google: 'VQoGNl67LtYaYB-yOhc8N_G1pyNl7cUr2M-20CRQXtU',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-slate-100 antialiased selection:bg-[#7a0000] selection:text-white">
        <ActivityTracker />
        {children}
      </body>
    </html>
  );
}
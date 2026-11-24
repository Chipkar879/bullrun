import ActivityTracker from '@/components/ActivityTracker';
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, JSON_LD } from '@/lib/site';
import ThemeCustomizer from '@/components/ThemeCustomizer';
import { THEME_ENGINE_SOURCE } from '@/lib/theme-engine';
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headlines (rounded, friendly, game-like)
const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const viewport = {
  themeColor: "#0A1226",
};

// TOTAL REWRITTEN METADATA AND SEO CONFIGURATION
export const metadata = {
  title: {
    default: SITE_TITLE,
    template: '%s | ' + SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: 'education',
  keywords: [
    'stock market game for students',
    'paper trading India',
    'stock market simulator India',
    'virtual stock trading game',
    'learn stock market for teens',
    'school stock market competition',
    'classroom trading game',
    'finance quiz for students',
    'investing for students',
  ],
  authors: [{ name: 'Vikrant Chipkar' }],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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

import SiteStatus from '@/components/SiteStatus';

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_ENGINE_SOURCE }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body className="min-h-full flex flex-col bg-bull-bg text-slate-100 antialiased selection:bg-bull-lime selection:text-bull-ink">
        <ActivityTracker />
        <SiteStatus />{children}
        <footer className="mt-auto border-t border-bull-line px-4 py-4 text-center text-xs leading-relaxed text-bull-muted">
          Bull Run is an educational game. All prices are simulated, no real money is used, and nothing here is investment advice. Not affiliated with NSE, BSE or SEBI.
        </footer>
        <ThemeCustomizer />
      </body>
    </html>
  );
}
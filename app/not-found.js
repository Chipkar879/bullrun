import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Ambient Red Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-bull-lime/20 blur-[120px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-md w-full bg-bull-surface border-2 border-bull-line border-b-4 border-b-bull-lime-dark p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 animate-scaleUp">
        
        {/* Visual Graphic Element */}
        <div className="space-y-2">
          <span className="text-6xl block animate-bounce" role="img" aria-label="Stock Down">📉</span>
          <h1 className="font-poppins font-black text-6xl text-bull-lime tracking-tight filter drop-shadow-[0_0_15px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)]">
            404
          </h1>
          <h2 className="font-poppins font-bold text-xl text-white">
            Market Delta Invalid
          </h2>
        </div>

        {/* Message */}
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
          Whoops! It looks like you tried to navigate to an index route or position that doesn&apos;t exist in Bull Run&apos;s records. Let&apos;s get your portfolio back on track.
        </p>

        <hr className="border-bull-line" />

        {/* Dynamic Resource Redirect Links */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Safe Target Portals
          </div>
          
          <div className="grid grid-cols-1 gap-2.5">
            <Link 
              href="/" 
              className="p-3 bg-bull-lime hover:bg-bull-lime-light border border-bull-lime-dark rounded-xl text-xs font-black uppercase tracking-wider text-bull-ink transition-all shadow-md block text-center"
            >
              🏠 Return to Home Base
            </Link>
            
            <Link 
              href="/simulator" 
              className="p-3 bg-bull-raised border border-bull-line hover:border-bull-lime/50 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all block text-center"
            >
              📈 Launch Paper Trading Simulator
            </Link>

            <Link 
              href="/courses" 
              className="p-3 bg-bull-raised border border-bull-line hover:border-bull-lime/50 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all block text-center"
            >
              📚 Open Learning Modules
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
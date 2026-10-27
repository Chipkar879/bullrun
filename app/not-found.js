import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Ambient Red Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#7a0000]/20 blur-[120px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-md w-full bg-[#0f0505] border-2 border-[#2b0808] border-b-4 border-b-[#7a0000] p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 animate-scaleUp">
        
        {/* Visual Graphic Element */}
        <div className="space-y-2">
          <span className="text-6xl block animate-bounce" role="img" aria-label="Stock Down">📉</span>
          <h1 className="font-poppins font-black text-6xl text-[#ff3333] tracking-tight filter drop-shadow-[0_0_15px_rgba(255,51,51,0.3)]">
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

        <hr className="border-[#2b0808]" />

        {/* Dynamic Resource Redirect Links */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Safe Target Portals
          </div>
          
          <div className="grid grid-cols-1 gap-2.5">
            <Link 
              href="/" 
              className="p-3 bg-[#7a0000] hover:bg-[#a30000] border border-[#a30000] rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md block text-center"
            >
              🏠 Return to Home Base
            </Link>
            
            <Link 
              href="/simulator" 
              className="p-3 bg-[#1a0808] border border-[#2b0808] hover:border-[#7a0000] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all block text-center"
            >
              📈 Launch Paper Trading Simulator
            </Link>

            <Link 
              href="/courses" 
              className="p-3 bg-[#1a0808] border border-[#2b0808] hover:border-[#7a0000] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all block text-center"
            >
              📚 Open Learning Modules
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
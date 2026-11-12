export default function Features() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 bg-bull-surface border border-bull-line rounded-2xl shadow-xl">
        <h3 className="font-bold text-lg text-white">📈 Live Tracking</h3>
        <p className="text-bull-muted text-sm mt-2">Simulate real-time exchange feeds instantly.</p>
      </div>
      <div className="p-6 bg-bull-surface border border-bull-line rounded-2xl shadow-xl">
        <h3 className="font-bold text-lg text-white">🚀 Risk Free</h3>
        <p className="text-bull-muted text-sm mt-2">Test your strategies using virtual platform funds.</p>
      </div>
      <div className="p-6 bg-bull-surface border border-bull-line rounded-2xl shadow-xl">
        <h3 className="font-bold text-lg text-white">🎓 Guided Lessons</h3>
        <p className="text-bull-muted text-sm mt-2">Learn module concepts inside our built-in arena.</p>
      </div>
    </section>
  );
}

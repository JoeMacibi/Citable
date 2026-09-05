const stats = [
  { label: 'Overall visibility', value: '82', suffix: '/100', accent: 'text-cyan-400' },
  { label: 'AI mentions', value: '14', suffix: 'tracks', accent: 'text-violet-400' },
  { label: 'Priority fixes', value: '7', suffix: 'urgent', accent: 'text-amber-400' },
];

const progress = [
  { label: 'Homepage crawl', value: 92, color: 'bg-cyan-400' },
  { label: 'Schema coverage', value: 74, color: 'bg-violet-400' },
  { label: 'AI mention scan', value: 58, color: 'bg-amber-400' },
];

const priorities = [
  'Missing Product JSON-LD on the pricing page',
  'Duplicate title tags on category URLs',
  'AI mention gap for “best HR software for startups”',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-10 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Citable</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Visibility command center</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              aria-label="Domain"
              defaultValue="https://example.com"
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 outline-none ring-0 placeholder:text-slate-500"
            />
            <button className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400">
              Start audit
            </button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-bold text-white">{stat.value}</span>
                <span className={`pb-2 text-lg ${stat.accent}`}>{stat.suffix}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Live audit flow</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                Running
              </span>
            </div>

            <div className="space-y-4">
              {progress.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-sm text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800">
                    <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Top priorities</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              {priorities.map((item, index) => (
                <li
                  key={item}
                  className={[
                    'rounded-xl border p-3',
                    index === 0 && 'border-red-500/20 bg-red-500/5',
                    index === 1 && 'border-amber-500/20 bg-amber-500/5',
                    index === 2 && 'border-cyan-500/20 bg-cyan-500/5',
                  ].join(' ')}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

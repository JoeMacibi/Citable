export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Citable</p>
            <h1 className="mt-2 text-3xl font-semibold">Visibility command center</h1>
          </div>
          <button className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400">
            Start audit
          </button>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Overall visibility</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-5xl font-bold text-white">82</span>
              <span className="pb-2 text-lg text-cyan-400">/100</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">AI mentions</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-5xl font-bold text-white">14</span>
              <span className="pb-2 text-lg text-violet-400">tracks</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Priority fixes</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-5xl font-bold text-white">7</span>
              <span className="pb-2 text-lg text-amber-400">urgent</span>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live audit flow</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                Running
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Homepage crawl</span>
                  <span>92%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div className="h-2.5 w-[92%] rounded-full bg-cyan-400" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Schema coverage</span>
                  <span>74%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div className="h-2.5 w-[74%] rounded-full bg-violet-400" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>AI mention scan</span>
                  <span>58%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div className="h-2.5 w-[58%] rounded-full bg-amber-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Top priorities</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              <li className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                Missing Product JSON-LD on the pricing page
              </li>
              <li className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                Duplicate title tags on category URLs
              </li>
              <li className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                AI mention gap for “best HR software for startups”
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

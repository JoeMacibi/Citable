'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PromptEntry = {
  id: number;
  prompt: string;
  mentions: number;
  citations: number;
  model: string;
};

export default function AiVisibilityPage() {
  const [prompt, setPrompt] = useState('What is the best accounting software for remote teams?');
  const [entries, setEntries] = useState<PromptEntry[]>([]);

  async function loadEntries() {
    const res = await fetch(`${API_BASE}/api/ai/track`);
    const payload = await res.json();
    if (payload.ok) setEntries(payload.prompts ?? []);
  }

  useEffect(() => { loadEntries(); }, []);

  async function onSubmit() {
    const res = await fetch(`${API_BASE}/api/ai/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'mock' }),
    });
    const payload = await res.json();
    if (payload.ok) {
      setPrompt('');
      await loadEntries();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-slate-100">
      <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400">AI visibility</p>
          <h1 className="mt-2 text-3xl font-semibold">Prompt tracking & citation graph</h1>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/" className="rounded-full border border-slate-700 px-3 py-2">Dashboard</a>
          <a href="/products" className="rounded-full border border-slate-700 px-3 py-2">Products</a>
          <a href="/ai-visibility" className="rounded-full bg-amber-500 px-3 py-2 text-slate-950">AI Visibility</a>
        </nav>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Track buyer prompt</h2>
          <div className="mt-4 space-y-4">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <button onClick={onSubmit} className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950">Track prompt</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Citation flow</h2>
          {entries.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              Track your first buyer prompt to see mentions and citations.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="font-medium text-white">{entry.prompt}</div>
                  <div className="mt-2 text-xs text-slate-400">Mentions: {entry.mentions} · Citations: {entry.citations}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-200">
                    <span>Brand</span>
                    <span>→</span>
                    <span>AI Response</span>
                    <span>→</span>
                    <span>Cited Source Domain</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

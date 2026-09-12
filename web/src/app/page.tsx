'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditStatus = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  domain: string;
  intent: 'website' | 'product' | 'ai';
  visibilityScore: number;
  technicalScore: number;
  findings: Array<{ id: string; title: string; severity: string; impact: number; effort: string; recommendation: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function Home() {
  const [domain, setDomain] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditStatus | null>(null);
  const [productName, setProductName] = useState('Acme Growth Suite');
  const [productPrice, setProductPrice] = useState('49');
  const [prompt, setPrompt] = useState('What is the best HR software for remote teams?');
  const [aiResponse, setAiResponse] = useState<any>(null);

  const currentStatusText = useMemo(() => {
    if (!audit) return 'No audit started';
    return `${audit.status} · ${audit.visibilityScore}/100 visibility`;
  }, [audit]);

  useEffect(() => {
    if (!audit || audit.status === 'COMPLETED' || audit.status === 'FAILED') return;

    const timer = setInterval(async () => {
      const response = await fetch(`${API_BASE}/api/audits/${audit.id}/status`);
      const payload = await response.json();
      if (payload.ok && payload.audit) {
        setAudit(payload.audit);
      }
    }, 1400);

    return () => clearInterval(timer);
  }, [audit]);

  const startAudit = async () => {
    setLoading(true);
    const response = await fetch(`${API_BASE}/api/audits/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, intent: 'website' }),
    });
    const payload = await response.json();
    if (payload.ok) {
      setAudit(payload.audit);
    }
    setLoading(false);
  };

  const addProduct = async () => {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName, description: 'AI visibility and workflow automation platform', price: Number(productPrice), currency: 'USD' }),
    });
    const payload = await response.json();
    if (payload.ok) {
      alert(`Product created: ${payload.product.name}`);
    }
  };

  const trackPrompt = async () => {
    const response = await fetch(`${API_BASE}/api/ai/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'mock', organizationId: 'org_demo_01' }),
    });
    const payload = await response.json();
    if (payload.ok) {
      setAiResponse(payload.result);
    }
  };

  const stats = [
    { label: 'Overall visibility', value: audit?.visibilityScore ?? 82, suffix: '/100', accent: 'text-cyan-400' },
    { label: 'AI mentions', value: aiResponse?.mentions ?? 14, suffix: 'tracks', accent: 'text-violet-400' },
    { label: 'Priority fixes', value: audit?.findings?.length ?? 7, suffix: 'urgent', accent: 'text-amber-400' },
  ];

  const progress = [
    { label: 'Homepage crawl', value: audit?.status === 'COMPLETED' ? 100 : audit ? 72 : 42, color: 'bg-cyan-400' },
    { label: 'Schema coverage', value: audit?.technicalScore ?? 74, color: 'bg-violet-400' },
    { label: 'AI mention scan', value: aiResponse ? 83 : 58, color: 'bg-amber-400' },
  ];

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
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 outline-none ring-0 placeholder:text-slate-500"
            />
            <button
              onClick={startAudit}
              disabled={loading}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Running…' : 'Start audit'}
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
                {currentStatusText}
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
              {(audit?.findings ?? [
                { id: '1', title: 'Missing Product JSON-LD on pricing page', severity: 'High', impact: 92, effort: 'Low', recommendation: 'Add valid product schema' },
                { id: '2', title: 'Duplicate title tags on key route', severity: 'Medium', impact: 67, effort: 'Medium', recommendation: 'Create unique titles' },
              ]).map((finding) => (
                <li key={finding.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="font-medium text-white">{finding.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {finding.severity} · impact {finding.impact} · effort {finding.effort}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Products</h2>
            <div className="mt-4 space-y-4">
              <input value={productName} onChange={(event) => setProductName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="Product name" />
              <input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="Price in USD" />
              <button onClick={addProduct} className="rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400">Add product</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">AI visibility</h2>
            <div className="mt-4 space-y-4">
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="Track a customer prompt" />
              <button onClick={trackPrompt} className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400">Track prompt</button>
              {aiResponse ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">
                  <div><strong>Mentions:</strong> {aiResponse.mentions}</div>
                  <div><strong>Citations:</strong> {aiResponse.citations}</div>
                  <div className="mt-2 text-xs text-emerald-100/80">{aiResponse.summary}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

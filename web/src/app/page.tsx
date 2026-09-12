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

const defaultFinding = {
  id: 'default-1',
  title: 'Missing Product JSON-LD on pricing page',
  severity: 'High',
  impact: 92,
  effort: 'Low',
  recommendation: 'Add valid product schema to the pricing page.',
};

export default function Home() {
  const [domain, setDomain] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditStatus | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState('Acme Growth Suite');
  const [productPrice, setProductPrice] = useState('49');
  const [productDescription, setProductDescription] = useState('AI visibility and workflow automation platform');
  const [productSku, setProductSku] = useState('ACME-GROWTH-001');
  const [prompt, setPrompt] = useState('What is the best HR software for remote teams?');
  const [aiResponse, setAiResponse] = useState<any>(null);

  const currentStatusText = useMemo(() => {
    if (!audit) return 'No audit started';
    return `${audit.status} · ${audit.visibilityScore}/100 visibility`;
  }, [audit]);

  const statusTimeline = [
    { label: 'Queued', detail: 'Job enqueued, starting crawler…', active: !audit || audit.status === 'QUEUED' },
    { label: 'Crawling', detail: 'Discovering pages and checking robots.txt / sitemap.xml…', active: audit?.status === 'RUNNING' },
    { label: 'Analyzing', detail: 'Auditing metadata, structured JSON-LD, and technical SEO…', active: audit?.status === 'RUNNING' },
    { label: 'Completed', detail: 'Generating Citable visibility score and prioritized fixes…', active: audit?.status === 'COMPLETED' },
  ];

  useEffect(() => {
    if (!audit || audit.status === 'COMPLETED' || audit.status === 'FAILED') return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/audits/${audit.id}/status`);
        const payload = await response.json();
        if (payload.ok && payload.audit) {
          setAudit(payload.audit);
        }
      } catch {
        // ignore transient polling error while the queue is still initializing
      }
    }, 1400);

    return () => clearInterval(timer);
  }, [audit]);

  const startAudit = async () => {
    setLoading(true);
    setError(null);

    try {
      const normalized = domain.trim();
      new URL(normalized);
      const response = await fetch(`${API_BASE}/api/audits/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: normalized, intent: 'website' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.message || 'Unable to create the audit.');
      }
      setAudit(payload.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not reach this URL. Please check the domain and try again.');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async () => {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: productName,
        description: productDescription,
        price: Number(productPrice),
        currency: 'USD',
        sku: productSku,
      }),
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
      body: JSON.stringify({ prompt, model: 'mock', organizationId: 1 }),
    });
    const payload = await response.json();
    if (payload.ok) {
      setAiResponse(payload.result);
    }
  };

  const stats = [
    { label: 'Overall visibility', value: audit?.visibilityScore ?? 82, suffix: '/100', accent: 'text-cyan-400', source: 'Source: Citable Engine' },
    { label: 'AI mentions', value: aiResponse?.mentions ?? 14, suffix: 'tracks', accent: 'text-violet-400', source: 'Source: AI Visibility' },
    { label: 'Priority fixes', value: audit?.findings?.length ?? 7, suffix: 'urgent', accent: 'text-amber-400', source: 'Source: Search Console' },
  ];

  const visibleFindings = audit?.findings?.length ? audit.findings : [defaultFinding];

  const handlePreview = (finding: any) => {
    const issue = finding.title ?? 'Missing product schema';
    const fix = issue.includes('JSON')
      ? '{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "Acme Growth Suite",\n  "offers": {"@type": "Offer", "price": "49", "priceCurrency": "USD"}\n}'
      : '<title>Acme Growth Suite | AI Visibility & Workflow Automation</title>\n<meta name="description" content="Ship faster with AI workflows for product, ops, and revenue teams." />';

    setSelectedFinding({ ...finding, fix });
  };

  const copyFix = async () => {
    if (!selectedFinding) return;
    await navigator.clipboard.writeText(selectedFinding.fix ?? '');
    setSelectedFinding(null);
  };

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

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <button onClick={startAudit} className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white">Retry</button>
            </div>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-bold text-white">{stat.value}</span>
                <span className={`pb-2 text-lg ${stat.accent}`}>{stat.suffix}</span>
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">{stat.source}</div>
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
              {statusTimeline.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold ${step.active ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                      {index + 1}
                    </div>
                    {index !== statusTimeline.length - 1 ? <div className="mt-2 h-8 w-px bg-slate-700" /> : null}
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-200">{step.label}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{step.active ? 'active' : 'pending'}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
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
              {visibleFindings.map((finding) => (
                <li key={finding.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="font-medium text-white">{finding.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {finding.severity} · impact {finding.impact} · effort {finding.effort}
                  </div>
                  <button
                    onClick={() => handlePreview(finding)}
                    className="mt-3 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-white/10"
                  >
                    Fix Issue
                  </button>
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
              <input value={productDescription} onChange={(event) => setProductDescription(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="Product description" />
              <input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="Price in USD" />
              <input value={productSku} onChange={(event) => setProductSku(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="SKU" />
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

      {selectedFinding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Recommendation preview</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selectedFinding.title}</h3>
              </div>
              <button onClick={() => setSelectedFinding(null)} className="text-sm text-slate-400 hover:text-white">Dismiss</button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Current issue</div>
                <div>{selectedFinding.title}</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Citable suggested fix</div>
                <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 whitespace-pre-wrap text-xs leading-6 text-cyan-200">{selectedFinding.fix}</pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedFinding(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Dismiss</button>
              <button onClick={copyFix} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">Approve & Copy Code</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

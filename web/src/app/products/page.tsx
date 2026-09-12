'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  sku: string | null;
  schemaValid: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('Acme Growth Suite');
  const [description, setDescription] = useState('AI visibility and workflow automation platform');
  const [price, setPrice] = useState('49');
  const [sku, setSku] = useState('ACME-GROWTH-001');

  async function loadProducts() {
    const res = await fetch(`${API_BASE}/api/products`);
    const payload = await res.json();
    if (payload.ok) setProducts(payload.products ?? []);
  }

  useEffect(() => { loadProducts(); }, []);

  async function onSubmit() {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price: Number(price), currency: 'USD', sku }),
    });
    const payload = await res.json();
    if (payload.ok) {
      setName('');
      setDescription('');
      setPrice('');
      setSku('');
      await loadProducts();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-slate-100">
      <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400">Products</p>
          <h1 className="mt-2 text-3xl font-semibold">Product visibility & schema health</h1>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/" className="rounded-full border border-slate-700 px-3 py-2">Dashboard</a>
          <a href="/products" className="rounded-full bg-violet-500 px-3 py-2 text-slate-950">Products</a>
          <a href="/ai-visibility" className="rounded-full border border-slate-700 px-3 py-2">AI Visibility</a>
        </nav>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Add a product</h2>
          <div className="mt-4 space-y-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <button onClick={onSubmit} className="rounded-full bg-violet-500 px-4 py-2 font-medium text-slate-950">Create product</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Product scorecard</h2>
          {products.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              Add your first product to analyze search and AI readiness.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {products.map((product) => {
                const score = Math.min(100, Math.max(60, 82 + (product.schemaValid ? 10 : -8) + (product.description ? 8 : -5)));
                return (
                  <div key={product.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{product.name}</div>
                        <div className="text-xs text-slate-400">{product.currency} {product.price / 100}</div>
                      </div>
                      <div className="text-2xl font-semibold text-violet-300">{Math.round(score)}/100</div>
                    </div>
                    <div className="mt-3 text-xs text-slate-300">
                      {product.description ? 'Description present' : 'Missing description'} · {product.schemaValid ? 'Product schema detected' : 'No Product JSON-LD'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

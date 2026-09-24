'use client';

import { FormEvent, useEffect, useState } from 'react';
import { telemetry } from '@/lib/telemetry';

type AuditStep = {
  label: string;
  status: 'complete' | 'active' | 'pending';
};

const initialSteps: AuditStep[] = [
  { label: 'Website Crawler active', status: 'complete' },
  { label: 'Extracting metadata and structured schema', status: 'complete' },
  { label: 'Running AI Visibility Collector across LLMs', status: 'active' },
  { label: 'Calculating Citable Visibility Score', status: 'pending' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function GoogleMark() {
  return <span aria-hidden="true" className="text-base font-semibold text-white">G</span>;
}

function GithubMark() {
  return <span aria-hidden="true" className="text-lg leading-none text-white">◉</span>;
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('your domain');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState(initialSteps);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submittedDomain = params.get('domain');
    if (submittedDomain) {
      try {
        setDomain(new URL(submittedDomain).hostname.replace(/^www\./, ''));
      } catch {
        setDomain(submittedDomain);
      }
    }

    const timer = window.setTimeout(() => {
      setSteps((current) => current.map((step, index) => ({
        ...step,
        status: index < 3 ? 'complete' : index === 3 ? 'active' : 'pending',
      })));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, []);

  function completeSignup(method: 'email' | 'oauth') {
    telemetry.track({ name: 'signup_completed', properties: { method, plan: 'free-audit' } });
    setSubmitted(true);
    setNotice('Your report is ready to open.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'We could not create your account.');
      }
      completeSignup('email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOAuthClick() {
    setError('');
    setNotice('Google and GitHub sign-in will be available once OAuth credentials are configured.');
  }

  return (
    <main className="min-h-screen bg-[#090a0c] text-[#f4f4f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <section className="flex w-full flex-1 flex-col px-6 py-7 sm:px-10 lg:px-16 lg:py-10 xl:px-24">
          <header className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[#6ee7b7]/50 bg-[#6ee7b7]/10 font-mono text-sm font-bold text-[#6ee7b7]">C</div>
            <span className="text-sm font-semibold tracking-[0.2em] text-white">CITABLE</span>
          </header>

          <div className="my-auto w-full max-w-[460px] py-16">
            <div className="mb-8">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[#6ee7b7]">Free visibility report</p>
              <h1 className="max-w-md text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[40px] sm:leading-[1.08]">Create your account to view your results.</h1>
              <p className="mt-4 max-w-md text-[15px] leading-7 text-[#8b8d94]">We are analyzing your domain&apos;s visibility across ChatGPT, Claude, Perplexity, and Google AI Overviews.</p>
              <p className="mt-3 font-mono text-xs text-[#6ee7b7]">/{domain}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleOAuthClick} className="flex h-12 items-center justify-center gap-3 border border-[#27292d] bg-[#101114] text-sm font-medium text-[#f4f4f5] transition hover:border-[#6ee7b7]/60 hover:bg-[#15181a]">
                <GoogleMark />
                Continue with Google
              </button>
              <button type="button" onClick={handleOAuthClick} className="flex h-12 items-center justify-center gap-3 border border-[#27292d] bg-[#101114] text-sm font-medium text-[#f4f4f5] transition hover:border-[#6ee7b7]/60 hover:bg-[#15181a]">
                <GithubMark />
                Continue with GitHub
              </button>
            </div>

            <div className="my-7 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-[#62656d]">
              <span className="h-px flex-1 bg-[#27292d]" />
              or continue with email
              <span className="h-px flex-1 bg-[#27292d]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#c8c9cd]">Work email</span>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-12 w-full border border-[#27292d] bg-[#101114] px-4 text-sm text-white outline-none transition placeholder:text-[#62656d] focus:border-[#6ee7b7] focus:ring-1 focus:ring-[#6ee7b7]/30" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#c8c9cd]">Password</span>
                <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" className="h-12 w-full border border-[#27292d] bg-[#101114] px-4 text-sm text-white outline-none transition placeholder:text-[#62656d] focus:border-[#6ee7b7] focus:ring-1 focus:ring-[#6ee7b7]/30" />
              </label>
              <button type="submit" disabled={submitted || submitting} className="flex h-12 w-full items-center justify-center gap-2 bg-[#6ee7b7] text-sm font-semibold text-[#090a0c] transition hover:bg-[#a7f3d0] disabled:cursor-default disabled:opacity-80">
                {submitted ? 'Report unlocked' : submitting ? 'Creating account...' : 'View Visibility Report'}
                <span aria-hidden="true">-&gt;</span>
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-[#62656d]">By continuing, you agree to Citable&apos;s Terms and Privacy Policy.</p>
            {error ? <p role="alert" className="mt-4 text-center text-sm text-red-300">{error}</p> : null}
            {notice ? <p role="status" className="mt-4 text-center text-sm text-[#6ee7b7]">{notice}</p> : null}
          </div>
        </section>

        <section className="relative flex w-full flex-1 items-center overflow-hidden border-t border-[#27292d] bg-[#0d1110] px-6 py-12 sm:px-10 lg:border-l lg:border-t-0 lg:px-16 xl:px-24">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#16352855,transparent_55%)]" />
          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#6ee7b7]">Citable Intelligence Engine</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">Your audit is in motion.</h2>
              </div>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6ee7b7]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#6ee7b7]" /> live</span>
            </div>

            <div className="border border-[#27292d] bg-[#101114]/90 p-5 shadow-2xl shadow-black/20 sm:p-7">
              <div className="mb-7 flex items-end justify-between border-b border-[#27292d] pb-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#62656d]">Scanning target</p>
                  <p className="mt-2 font-mono text-sm text-[#f4f4f5]">{domain}</p>
                </div>
                <span className="font-mono text-xs text-[#8b8d94]">AUD-2048</span>
              </div>

              <div className="space-y-5">
                {steps.map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] ${step.status === 'complete' ? 'border-[#6ee7b7] bg-[#6ee7b7] font-bold text-[#090a0c]' : step.status === 'active' ? 'border-[#6ee7b7] text-[#6ee7b7]' : 'border-[#3b3e44] text-[#62656d]'}`}>
                      {step.status === 'complete' ? '✓' : step.status === 'active' ? <span className="h-2 w-2 animate-spin rounded-full border border-[#6ee7b7] border-t-transparent" /> : '·'}
                    </span>
                    <span className={`text-sm ${step.status === 'pending' ? 'text-[#62656d]' : 'text-[#d7d8dc]'}`}>{step.label}</span>
                    {step.status === 'complete' ? <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[#6ee7b7]">done</span> : null}
                  </div>
                ))}
              </div>

              <div className="relative mt-8 overflow-hidden border border-[#27292d] bg-[#14171a] p-4 opacity-60 blur-[0.4px]">
                <div className="mb-4 flex items-center justify-between"><span className="text-xs font-medium text-[#f4f4f5]">AEO Insights</span><span className="font-mono text-[10px] text-[#6ee7b7]">PREVIEW</span></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 border border-[#27292d] bg-[#101114] p-2"><span className="font-mono text-[9px] text-[#62656d]">VISIBILITY</span><div className="mt-2 text-lg font-semibold text-[#6ee7b7]">82</div></div>
                  <div className="h-16 border border-[#27292d] bg-[#101114] p-2"><span className="font-mono text-[9px] text-[#62656d]">MENTIONS</span><div className="mt-2 text-lg font-semibold text-white">14</div></div>
                  <div className="h-16 border border-[#27292d] bg-[#101114] p-2"><span className="font-mono text-[9px] text-[#62656d]">CITATIONS</span><div className="mt-2 text-lg font-semibold text-white">09</div></div>
                </div>
                <div className="mt-3 h-2 w-3/4 bg-[#6ee7b7]/30" /><div className="mt-2 h-2 w-1/2 bg-[#27292d]" />
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-[#8b8d94]"><span className="mr-2 text-[#6ee7b7]">✦</span>Join 12,000+ users tracking AI visibility</p>
          </div>
        </section>
      </div>
    </main>
  );
}
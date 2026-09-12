import { randomUUID } from 'node:crypto';
import { crawlQueue } from './queue.js';

export const jobStatusStore = new Map<string, any>();

export async function startAuditJob(payload: { domain: string; intent: 'website' | 'product' | 'ai' }) {
  const id = randomUUID();
  const initial = {
    id,
    domain: payload.domain,
    intent: payload.intent,
    status: 'QUEUED',
    visibilityScore: 0,
    technicalScore: 0,
    findings: [],
  };

  jobStatusStore.set(id, initial);

  await crawlQueue.add('crawl-site', { auditId: id, domain: payload.domain, intent: payload.intent }, {
    removeOnComplete: true,
    removeOnFail: true,
  });

  setTimeout(() => {
    const current = jobStatusStore.get(id) ?? initial;
    jobStatusStore.set(id, {
      ...current,
      status: 'RUNNING',
    });
  }, 200);

  setTimeout(async () => {
    const current = jobStatusStore.get(id) ?? initial;
    jobStatusStore.set(id, {
      ...current,
      status: 'COMPLETED',
      visibilityScore: 82,
      technicalScore: 78,
      findings: [
        {
          id: 'rec-1',
          title: 'Missing Product JSON-LD on pricing page',
          severity: 'High',
          impact: 92,
          effort: 'Low',
          recommendation: 'Add JSON-LD Product schema with price, currency, availability, and reviews.',
        },
        {
          id: 'rec-2',
          title: 'Duplicate title tags across key routes',
          severity: 'Medium',
          impact: 67,
          effort: 'Medium',
          recommendation: 'Create unique metadata and canonical tags for category pages.',
        },
      ],
    });
  }, 2600);

  return { id, payload };
}

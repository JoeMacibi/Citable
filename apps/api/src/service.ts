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
    removeOnComplete: false,
    removeOnFail: false,
  });

  setTimeout(() => {
    const current = jobStatusStore.get(id) ?? initial;
    if (current.status === 'QUEUED') {
      jobStatusStore.set(id, {
        ...current,
        status: 'RUNNING',
      });
    }
  }, 250);

  return { id, payload };
}

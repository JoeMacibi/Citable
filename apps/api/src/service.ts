import { randomUUID } from 'node:crypto';
import { crawlQueue } from './queue.js';
import { db } from './db.js';
import { audits, auditFindings, organizations, websites } from './schema.js';
import { eq, desc } from 'drizzle-orm';
import { normalizeUrl } from './security.js';
import { executeCrawlJob } from './crawlerWorker.js';

export const jobStatusStore = new Map<string, any>();

async function getOrCreateWebsite(domain: string, organizationId?: number) {
  try {
    let orgId = organizationId;
    if (!orgId) {
      const existingOrgs = await db.select().from(organizations).limit(1);
      if (existingOrgs[0]) {
        orgId = existingOrgs[0].id;
      } else {
        const [newOrg] = await db.insert(organizations).values({ name: 'Acme Commerce' }).returning();
        orgId = newOrg.id;
      }
    }

    const cleanHostname = new URL(normalizeUrl(domain)).hostname;
    const existingWebsites = await db.select().from(websites).where(eq(websites.domain, cleanHostname)).limit(1);
    if (existingWebsites[0]) {
      return existingWebsites[0];
    }

    const [created] = await db.insert(websites).values({
      organizationId: orgId!,
      domain: cleanHostname,
      companyName: cleanHostname.replace(/^www\./i, '').split('.')[0],
    }).returning();

    return created;
  } catch (err) {
    // Return null in memory-backed mode
    return null;
  }
}

export async function startAuditJob(payload: { domain: string; intent: 'website' | 'product' | 'ai' }) {
  const normalizedDomain = normalizeUrl(payload.domain);
  const id = randomUUID();

  const initial = {
    id,
    domain: normalizedDomain,
    intent: payload.intent,
    status: 'QUEUED',
    visibilityScore: 0,
    technicalScore: 0,
    findings: [],
    createdAt: new Date().toISOString(),
  };

  jobStatusStore.set(id, initial);

  // Attempt database persistence
  try {
    const website = await getOrCreateWebsite(normalizedDomain);
    await db.insert(audits).values({
      id,
      websiteId: website?.id,
      domain: normalizedDomain,
      intent: payload.intent,
      status: 'QUEUED',
      visibilityScore: 0,
      technicalScore: 0,
    });
  } catch (err) {
    console.warn('[Audit Service] Notice: DB offline or skipping persistence:', (err as Error).message);
  }

  // Attempt BullMQ enqueue, with graceful fallback to background direct execution
  try {
    await crawlQueue.add(
      'crawl-site',
      { auditId: id, domain: normalizedDomain, intent: payload.intent },
      { removeOnComplete: 100, removeOnFail: 200 }
    );
  } catch (queueErr) {
    console.warn('[Queue Notice] BullMQ/Redis offline; executing crawler in standalone mode:', (queueErr as Error).message);
    setImmediate(async () => {
      await executeCrawlJob({ auditId: id, domain: normalizedDomain, intent: payload.intent });
    });
  }

  return { id, payload: { ...payload, domain: normalizedDomain } };
}

export async function getAuditStatus(id: string) {
  // Check fast in-memory store
  const cached = jobStatusStore.get(id);
  if (cached && (cached.status !== 'COMPLETED' || cached.findings?.length > 0)) {
    return cached;
  }

  // Check PostgreSQL
  try {
    const rows = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
    if (rows[0]) {
      const findingsRows = await db
        .select()
        .from(auditFindings)
        .where(eq(auditFindings.auditId, id))
        .orderBy(desc(auditFindings.impact));

      const restored = {
        id: rows[0].id,
        domain: rows[0].domain,
        intent: rows[0].intent,
        status: rows[0].status,
        visibilityScore: rows[0].visibilityScore ?? 0,
        technicalScore: rows[0].technicalScore ?? 0,
        findings: findingsRows.map((f) => ({
          id: f.id,
          title: f.issue,
          issue: f.issue,
          category: f.category,
          severity: f.severity,
          impact: f.impact,
          effort: f.effort,
          recommendation: f.recommendedFix,
          recommendedFix: f.recommendedFix,
          codeSnippet: f.codeSnippet,
          resolved: f.resolved ?? 0,
        })),
        createdAt: rows[0].createdAt,
      };

      jobStatusStore.set(id, restored);
      return restored;
    }
  } catch (err) {
    // Database query failed
  }

  return cached ?? null;
}

export async function approveAuditFinding(auditId: string, findingId: string) {
  const current = await getAuditStatus(auditId);
  if (current && Array.isArray(current.findings)) {
    current.findings = current.findings.map((f: any) => {
      if (f.id === findingId) {
        return { ...f, resolved: 1 };
      }
      return f;
    });
    jobStatusStore.set(auditId, current);
  }

  try {
    await db.update(auditFindings).set({ resolved: 1 }).where(eq(auditFindings.id, findingId));
  } catch {
    // In-memory fallback
  }

  return current;
}

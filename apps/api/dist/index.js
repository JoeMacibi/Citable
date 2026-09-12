import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { z } from 'zod';
import { db, ensureDatabase } from './db.js';
import { aiPrompts, organizations, products } from './schema.js';
import { jobStatusStore, startAuditJob } from './service.js';
import { eq } from 'drizzle-orm';
config();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
const createAuditSchema = z.object({
    domain: z.string().min(1),
    intent: z.enum(['website', 'product', 'ai']).default('website'),
});
const createProductSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().default(0),
    currency: z.string().default('USD'),
    organizationId: z.number().optional(),
});
const createAiTrackSchema = z.object({
    prompt: z.string().min(1),
    model: z.string().default('mock'),
    organizationId: z.number().optional(),
});
async function getOrCreateOrganization(organizationId) {
    if (organizationId) {
        const rows = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        if (rows[0])
            return rows[0];
    }
    const [organization] = await db.insert(organizations).values({ name: 'Acme Commerce' }).onConflictDoNothing().returning();
    if (organization)
        return organization;
    const [existing] = await db.select().from(organizations).where(eq(organizations.name, 'Acme Commerce')).limit(1);
    return existing ?? { id: 1, name: 'Acme Commerce' };
}
app.get('/api/health', async () => ({
    ok: true,
    service: 'citable-api',
    message: 'Citable API is running',
    timestamp: new Date().toISOString(),
}));
app.post('/api/audits/run', async (request, reply) => {
    const parsed = createAuditSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        reply.code(400);
        return { ok: false, errors: parsed.error.flatten() };
    }
    const { domain, intent } = parsed.data;
    const job = await startAuditJob({ domain, intent });
    return {
        ok: true,
        audit: {
            id: job.id,
            domain,
            intent,
            status: 'QUEUED',
            visibilityScore: 0,
            technicalScore: 0,
            findings: [],
        },
    };
});
app.get('/api/audits/:id/status', async (request, reply) => {
    const { id } = request.params;
    const status = await jobStatusStore.get(id);
    if (!status) {
        reply.code(404);
        return { ok: false, message: 'Audit not found' };
    }
    return { ok: true, audit: status };
});
app.post('/api/products', async (request, reply) => {
    const parsed = createProductSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        reply.code(400);
        return { ok: false, errors: parsed.error.flatten() };
    }
    const organization = await getOrCreateOrganization(parsed.data.organizationId);
    const [product] = await db.insert(products).values({
        organizationId: organization.id,
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        price: Math.round(parsed.data.price * 100),
        currency: parsed.data.currency,
        sku: `prod-${Date.now()}`,
        schemaValid: 1,
    }).returning();
    return { ok: true, product };
});
app.get('/api/products', async () => {
    const rows = await db.select().from(products).limit(50);
    return { ok: true, products: rows };
});
app.post('/api/audits/:id/retry', async (request, reply) => {
    const { id } = request.params;
    const current = jobStatusStore.get(id);
    if (!current) {
        reply.code(404);
        return { ok: false, message: 'Audit not found' };
    }
    const retryJob = await startAuditJob({ domain: current.domain, intent: current.intent });
    return { ok: true, audit: { id: retryJob.id, domain: current.domain, intent: current.intent, status: 'QUEUED' } };
});
app.post('/api/ai/track', async (request, reply) => {
    const parsed = createAiTrackSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        reply.code(400);
        return { ok: false, errors: parsed.error.flatten() };
    }
    const { prompt, model, organizationId } = parsed.data;
    const organization = await getOrCreateOrganization(organizationId);
    const result = {
        mentions: 12,
        citations: 4,
        summary: `The best-fitting response for “${prompt}” is based on product and SEO visibility signals.`,
        flow: ['Brand', 'AI Response', 'Cited Source Domain'],
    };
    const [record] = await db.insert(aiPrompts).values({
        organizationId: organization.id,
        prompt,
        model,
        mentions: result.mentions,
        citations: result.citations,
    }).returning();
    return { ok: true, result: { ...result, id: record?.id ?? Date.now() } };
});
app.get('/api/ai/track', async () => {
    const rows = await db.select().from(aiPrompts).limit(25);
    return { ok: true, prompts: rows };
});
app.get('/api/bootstrap', async () => {
    const [org] = await db.insert(organizations).values({ name: 'Acme Commerce' }).onConflictDoNothing().returning();
    return {
        ok: true,
        organization: org ?? { id: 1, name: 'Acme Commerce' },
    };
});
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
try {
    await ensureDatabase();
    await app.listen({ port, host });
    console.log(`Citable API listening on http://${host}:${port}`);
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}

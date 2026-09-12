import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { z } from 'zod';
import { db } from './db.js';
import { aiPrompts, organizations, products } from './schema.js';
import { jobStatusStore, startAuditJob } from './service.js';
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
    const organizationId = parsed.data.organizationId ?? 1;
    const [product] = await db.insert(products).values({
        organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        price: Math.round(parsed.data.price * 100),
        currency: parsed.data.currency,
        sku: `prod-${Date.now()}`,
        schemaValid: 1,
    }).returning();
    return { ok: true, product };
});
app.post('/api/ai/track', async (request, reply) => {
    const parsed = createAiTrackSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        reply.code(400);
        return { ok: false, errors: parsed.error.flatten() };
    }
    const { prompt, model, organizationId = 1 } = parsed.data;
    const result = {
        mentions: 12,
        citations: 4,
        summary: `The best-fitting response for “${prompt}” is based on product and SEO visibility signals.`,
    };
    await db.insert(aiPrompts).values({
        organizationId,
        prompt,
        model,
        mentions: result.mentions,
        citations: result.citations,
    });
    return { ok: true, result };
});
app.get('/api/bootstrap', async () => {
    const [org] = await db.insert(organizations).values({ name: 'Acme Commerce' }).returning();
    return {
        ok: true,
        organization: org ?? { id: 1, name: 'Acme Commerce' },
    };
});
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
try {
    await app.listen({ port, host });
    console.log(`Citable API listening on http://${host}:${port}`);
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { z } from 'zod';
import { db, ensureDatabase } from './db.js';
import { crawlerWorker } from './crawlerWorker.js';
import { aiPrompts, organizations, products, users } from './schema.js';
import { approveAuditFinding, getAuditStatus, jobStatusStore, startAuditJob } from './service.js';
import { eq } from 'drizzle-orm';
import { analyzeProductSchema, buildProductSchemaSnippet } from './productSchema.js';
import { evaluateAiVisibility } from './aiVisibility.js';
import { createSessionToken, getSessionCookie, hashPassword, normalizeEmail, verifyPassword } from './auth.js';

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

const authSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

async function getOrCreateOrganization(organizationId?: number) {
  if (organizationId) {
    const rows = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (rows[0]) return rows[0];
  }

  const [organization] = await db.insert(organizations).values({ name: 'Acme Commerce' }).onConflictDoNothing().returning();
  if (organization) return organization;

  const [existing] = await db.select().from(organizations).where(eq(organizations.name, 'Acme Commerce')).limit(1);
  return existing ?? { id: 1, name: 'Acme Commerce' };
}

app.get('/api/health', async () => ({
  ok: true,
  service: 'citable-api',
  message: 'Citable API is running',
  timestamp: new Date().toISOString(),
}));

app.post('/api/auth/register', async (request, reply) => {
  const parsed = authSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    reply.code(400);
    return { ok: false, message: 'Enter a valid email and a password of at least 8 characters.' };
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser[0]) {
    reply.code(409);
    return { ok: false, message: 'An account with this email already exists.' };
  }

  const organization = await db.insert(organizations).values({ name: `${email.split('@')[0]}'s workspace` }).returning();
  const organizationId = organization[0]?.id;
  if (!organizationId) {
    reply.code(500);
    return { ok: false, message: 'We could not create your workspace.' };
  }

  const [user] = await db.insert(users).values({
    email,
    passwordHash: await hashPassword(parsed.data.password),
    organizationId,
  }).returning({ id: users.id, email: users.email, organizationId: users.organizationId });

  if (!user) {
    reply.code(500);
    return { ok: false, message: 'We could not create your account.' };
  }

  const token = createSessionToken({ userId: user.id, organizationId: user.organizationId, email: user.email });
  reply.header('Set-Cookie', getSessionCookie(token));
  return { ok: true, user };
});

app.post('/api/auth/login', async (request, reply) => {
  const parsed = authSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    reply.code(400);
    return { ok: false, message: 'Enter your email and password.' };
  }

  const email = normalizeEmail(parsed.data.email);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    reply.code(401);
    return { ok: false, message: 'Invalid email or password.' };
  }

  const token = createSessionToken({ userId: user.id, organizationId: user.organizationId, email: user.email });
  reply.header('Set-Cookie', getSessionCookie(token));
  return { ok: true, user: { id: user.id, email: user.email, organizationId: user.organizationId } };
});

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
  const { id } = request.params as { id: string };
  const status = await getAuditStatus(id);

  if (!status) {
    reply.code(404);
    return { ok: false, message: 'Audit not found' };
  }

  return { ok: true, audit: status };
});

app.post('/api/audits/:id/findings/:findingId/approve', async (request, reply) => {
  const { id, findingId } = request.params as { id: string; findingId: string };
  const status = await getAuditStatus(id);

  if (!status) {
    reply.code(404);
    return { ok: false, message: 'Audit not found' };
  }

  const updated = await approveAuditFinding(id, findingId);
  return { ok: true, audit: updated, findingId };
});

app.post('/api/products', async (request, reply) => {
  const parsed = createProductSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    reply.code(400);
    return { ok: false, errors: parsed.error.flatten() };
  }

  const organization = await getOrCreateOrganization(parsed.data.organizationId);
  const schemaAnalysis = analyzeProductSchema({
    name: parsed.data.name,
    description: parsed.data.description ?? '',
    price: parsed.data.price,
    currency: parsed.data.currency,
    sku: `prod-${Date.now()}`,
  });

  const [product] = await db.insert(products).values({
    organizationId: organization.id,
    name: parsed.data.name,
    description: parsed.data.description ?? '',
    price: Math.round(parsed.data.price * 100),
    currency: parsed.data.currency,
    sku: `prod-${Date.now()}`,
    schemaValid: schemaAnalysis.score >= 75 ? 1 : 0,
  }).returning();

  return { ok: true, product, schema: schemaAnalysis, snippet: buildProductSchemaSnippet({
    name: parsed.data.name,
    description: parsed.data.description ?? '',
    price: parsed.data.price,
    currency: parsed.data.currency,
    sku: `prod-${Date.now()}`,
    url: 'https://example.com/product',
  }) };
});

app.post('/api/products/schema/analyze', async (request, reply) => {
  const payload = request.body as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== 'object') {
    reply.code(400);
    return { ok: false, message: 'A product payload is required.' };
  }

  const analysis = analyzeProductSchema(payload);
  return { ok: true, analysis, snippet: buildProductSchemaSnippet(payload as Record<string, unknown>) };
});

app.get('/api/products', async () => {
  const rows = await db.select().from(products).limit(50);
  return { ok: true, products: rows };
});

app.post('/api/audits/:id/retry', async (request, reply) => {
  const { id } = request.params as { id: string };
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
  const result = evaluateAiVisibility(prompt, { model, organizationId: organization.id });

  const [record] = await db.insert(aiPrompts).values({
    organizationId: organization.id,
    prompt,
    model,
    mentions: result.mentions,
    citations: result.citations,
  }).returning();

  return { ok: true, result: { ...result, id: record?.id ?? Date.now() } };
});

app.post('/api/ai/visibility/evaluate', async (request, reply) => {
  const payload = request.body as { prompt?: string; model?: string } | undefined;
  const prompt = payload?.prompt ?? '';

  if (!prompt.trim()) {
    reply.code(400);
    return { ok: false, message: 'Prompt is required.' };
  }

  return { ok: true, result: evaluateAiVisibility(prompt, { model: payload?.model ?? 'mock' }) };
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
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

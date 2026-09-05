import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { z } from 'zod';

config();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

const createAuditSchema = z.object({
  domain: z.string().url().or(z.string().min(1)),
  intent: z.enum(['website', 'product', 'ai']).default('website'),
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
    return {
      ok: false,
      errors: parsed.error.flatten(),
    };
  }

  const { domain, intent } = parsed.data;

  const score = 82;

  return {
    ok: true,
    organizationId: 'org_demo_01',
    audit: {
      id: 'audit_demo_01',
      domain,
      intent,
      score,
      status: 'COMPLETED',
      overallVisibilityScore: `${score}/100`,
      message: 'Citable visibility audit completed for ' + domain,
    },
    recommendations: [
      {
        id: 'rec-1',
        label: 'Add product schema markup',
        priority: 'HIGH',
        impact: 92,
        confidence: 92,
      },
      {
        id: 'rec-2',
        label: 'Fix duplicate title tags',
        priority: 'MEDIUM',
        impact: 67,
        confidence: 78,
      },
    ],
  };
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`Citable API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

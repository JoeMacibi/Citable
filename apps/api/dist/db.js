import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
const connectionString = process.env.DATABASE_URL ?? 'postgresql://citable:citable@localhost:5432/citable';
export const pool = new Pool({
    connectionString,
    max: 10,
});
pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err);
});
export const db = drizzle(pool, { schema });
export async function ensureDatabase() {
    const sql = `
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS websites (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      domain TEXT NOT NULL,
      company_name TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audits (
      id VARCHAR(36) PRIMARY KEY,
      website_id INTEGER REFERENCES websites(id),
      domain TEXT NOT NULL,
      intent TEXT NOT NULL DEFAULT 'website',
      status TEXT NOT NULL DEFAULT 'QUEUED',
      visibility_score INTEGER DEFAULT 0,
      technical_score INTEGER DEFAULT 0,
      product_score INTEGER DEFAULT 0,
      ai_score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_findings (
      id VARCHAR(64) PRIMARY KEY,
      audit_id VARCHAR(36) NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      issue TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      impact INTEGER DEFAULT 0,
      effort TEXT NOT NULL,
      recommended_fix TEXT NOT NULL,
      code_snippet TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      sku TEXT,
      schema_valid INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_prompts (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      prompt TEXT NOT NULL,
      model TEXT DEFAULT 'mock',
      mentions INTEGER DEFAULT 0,
      citations INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Safe non-destructive column additions in case tables existed prior
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE audits ADD COLUMN IF NOT EXISTS domain TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      BEGIN
        ALTER TABLE audits ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'website';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      BEGIN
        ALTER TABLE audits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      BEGIN
        ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS code_snippet TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      BEGIN
        ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS resolved INTEGER DEFAULT 0;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END $$;
  `;
    try {
        await pool.query(sql);
        console.log('[Database] Tables and schema successfully verified.');
    }
    catch (err) {
        console.warn('[Database] ensureDatabase notice:', err.message);
    }
}

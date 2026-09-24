import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
export const organizations = pgTable('organizations', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    organizationId: integer('organization_id').references(() => organizations.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const websites = pgTable('websites', {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id').references(() => organizations.id).notNull(),
    domain: text('domain').notNull(),
    companyName: text('company_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const audits = pgTable('audits', {
    id: varchar('id', { length: 36 }).primaryKey(),
    websiteId: integer('website_id').references(() => websites.id),
    domain: text('domain').notNull(),
    intent: text('intent').default('website').notNull(),
    status: text('status').notNull().default('QUEUED'), // 'QUEUED' | 'CRAWLING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
    visibilityScore: integer('visibility_score').default(0),
    technicalScore: integer('technical_score').default(0),
    productScore: integer('product_score').default(0),
    aiScore: integer('ai_score').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export const auditFindings = pgTable('audit_findings', {
    id: varchar('id', { length: 64 }).primaryKey(),
    auditId: varchar('audit_id', { length: 36 }).references(() => audits.id).notNull(),
    issue: text('issue').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    impact: integer('impact').default(0),
    effort: text('effort').notNull(),
    recommendedFix: text('recommended_fix').notNull(),
    codeSnippet: text('code_snippet'),
    resolved: integer('resolved').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id').references(() => organizations.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').default(0),
    currency: varchar('currency', { length: 10 }).default('USD'),
    sku: text('sku'),
    schemaValid: integer('schema_valid').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const aiPrompts = pgTable('ai_prompts', {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id').references(() => organizations.id).notNull(),
    prompt: text('prompt').notNull(),
    model: text('model').default('mock'),
    mentions: integer('mentions').default(0),
    citations: integer('citations').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

import { Worker } from 'bullmq';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { redis } from './queue.js';
import { calculateTechnicalScore, validateTargetUrl } from './security.js';
import { jobStatusStore } from './service.js';
import { db } from './db.js';
import { audits, auditFindings } from './schema.js';
import { eq } from 'drizzle-orm';
const MAX_PAGES = 10;
string;
auditId: string;
issue: string;
category: 'technical' | 'schema' | 'content';
severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
impact: number;
effort: 'LOW' | 'MEDIUM' | 'HIGH';
recommendedFix: string;
codeSnippet: string;
resolved: number;
;
async function fetchPage(rawUrl) {
    const target = await validateTargetUrl(rawUrl);
    const response = await axios.get(target.toString(), {
        timeout: 8000,
        maxRedirects: 3,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CitableCrawler/1.0; +https://citable.site/bot)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        // Validate redirect destination before following
        beforeRedirect: async (options, responseDetails) => {
            if (responseDetails?.headers?.location) {
                await validateTargetUrl(responseDetails.headers.location);
            }
        },
    });
    return {
        url: target.toString(),
        html: typeof response.data === 'string' ? response.data : String(response.data),
        status: response.status,
    };
}
function extractMetadata(html, pageUrl) {
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get();
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
    const jsonLdSnippets = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).contents().text().trim();
        if (text)
            jsonLdSnippets.push(text);
    });
    const hasProductSchema = jsonLdSnippets.some((schema) => /Product/i.test(schema));
    const hasOrganizationSchema = jsonLdSnippets.some((schema) => /Organization/i.test(schema));
    const hasFaqSchema = jsonLdSnippets.some((schema) => /FAQPage/i.test(schema));
    return {
        url: pageUrl,
        title,
        description,
        h1s,
        canonical,
        schemaCount: jsonLdSnippets.length,
        hasProductSchema,
        hasOrganizationSchema,
        hasFaqSchema,
    };
}
export async function crawlSite(initialDomain, onProgress) {
    const targetUrl = await validateTargetUrl(initialDomain);
    const baseUrl = targetUrl.toString();
    onProgress?.('CRAWLING', { currentStep: 'Discovering pages and robots directives' });
    const queue = [baseUrl];
    const visited = new Set();
    const pageData = [];
    while (queue.length > 0 && pageData.length < MAX_PAGES) {
        const current = queue.shift();
        if (visited.has(current))
            continue;
        visited.add(current);
        try {
            const page = await fetchPage(current);
            const metadata = extractMetadata(page.html, page.url);
            pageData.push(metadata);
            // Extract internal links for continued crawling
            const $ = cheerio.load(page.html);
            $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
                    return;
                try {
                    const next = new URL(href, current).toString();
                    if (next.startsWith('http') && !visited.has(next) && queue.length < MAX_PAGES) {
                        // Keep crawler to the same hostname
                        if (new URL(next).hostname === targetUrl.hostname) {
                            queue.push(next);
                        }
                    }
                }
                catch {
                    // ignore malformed URLs
                }
            });
        }
        catch (err) {
            console.warn(`[Crawler] Notice fetching ${current}:`, err.message);
        }
    }
    onProgress?.('ANALYZING', { currentStep: 'Evaluating schema health, meta tags, and AEO signals' });
    const criticalFindings = pageData.filter((page) => !page.title || !page.description).length;
    const warnings = pageData.filter((page) => page.schemaCount === 0).length;
    const technicalScore = calculateTechnicalScore({ criticalFindings, warnings });
    const hasAnyProduct = pageData.some((p) => p.hasProductSchema);
    const hasAnyOrg = pageData.some((p) => p.hasOrganizationSchema);
    const schemaBonus = (hasAnyProduct ? 12 : 0) + (hasAnyOrg ? 10 : 0);
    const visibilityScore = Math.min(100, Math.max(35, Math.round((technicalScore * 0.65) + schemaBonus + (pageData.length > 1 ? 15 : 8))));
    return {
        crawledPages: pageData.length,
        technicalScore,
        visibilityScore,
        metadata: pageData,
    };
}
export async function executeCrawlJob(payload) {
    const { auditId, domain, intent } = payload;
    const updateStatus = async (status, extra = {}) => {
        const existing = jobStatusStore.get(auditId) ?? {
            id: auditId,
            domain,
            intent,
            status: 'QUEUED',
            visibilityScore: 0,
            technicalScore: 0,
            findings: [],
        };
        const updated = {
            ...existing,
            ...extra,
            status,
            updatedAt: new Date().toISOString(),
        };
        jobStatusStore.set(auditId, updated);
        try {
            await db.update(audits).set({
                status,
                visibilityScore: updated.visibilityScore ?? 0,
                technicalScore: updated.technicalScore ?? 0,
                updatedAt: new Date(),
            }).where(eq(audits.id, auditId));
        }
        catch {
            // Ignored if DB is in memory mode
        }
        return updated;
    };
    try {
        await updateStatus('CRAWLING');
        const result = await crawlSite(domain, (stage) => {
            updateStatus(stage);
        });
        await updateStatus('ANALYZING');
        const hostname = new URL(await validateTargetUrl(domain)).hostname;
        const cleanBrandName = hostname.replace(/^www\./i, '').split('.')[0];
        const capitalizedBrand = cleanBrandName.charAt(0).toUpperCase() + cleanBrandName.slice(1);
        const generatedFindings = [];
        // Finding 1: Homepage Title & Meta Description
        const homepage = result.metadata[0];
        if (!homepage?.title || !homepage?.description) {
            generatedFindings.push({
                id: `finding-${auditId}-meta`,
                auditId,
                issue: 'Missing or incomplete homepage title & meta description',
                category: 'technical',
                severity: 'HIGH',
                impact: 92,
                effort: 'LOW',
                recommendedFix: `Add a unique, descriptive <title> and meta description optimized for search bots and AI crawlers.`,
                codeSnippet: `<title>${capitalizedBrand} | Official Platform</title>\n<meta name="description" content="Discover ${capitalizedBrand} - industry-leading solutions designed for modern teams and global search discoverability." />`,
                resolved: 0,
            });
        }
        // Finding 2: Organization / Brand Schema
        if (!result.metadata.some((p) => p.hasOrganizationSchema)) {
            generatedFindings.push({
                id: `finding-${auditId}-org`,
                auditId,
                issue: 'Missing Organization JSON-LD Schema',
                category: 'schema',
                severity: 'HIGH',
                impact: 89,
                effort: 'LOW',
                recommendedFix: 'Implement Schema.org/Organization markup to establish brand authority across Perplexity, ChatGPT, and Google.',
                codeSnippet: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: capitalizedBrand,
                    url: `https://${hostname}`,
                    logo: `https://${hostname}/logo.png`,
                    sameAs: [
                        `https://twitter.com/${cleanBrandName}`,
                        `https://linkedin.com/company/${cleanBrandName}`,
                    ],
                }, null, 2),
                resolved: 0,
            });
        }
        // Finding 3: Product / Pricing Schema
        if (!result.metadata.some((p) => p.hasProductSchema)) {
            generatedFindings.push({
                id: `finding-${auditId}-product`,
                auditId,
                issue: 'Missing Product JSON-LD markup on commercial offerings',
                category: 'schema',
                severity: 'MEDIUM',
                impact: 84,
                effort: 'MEDIUM',
                recommendedFix: 'Add rich Product schema with offer pricing in USD to unlock Google rich snippets and AI purchasing recommendations.',
                codeSnippet: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: `${capitalizedBrand} Subscription`,
                    description: `Access full ${capitalizedBrand} capabilities with automated workflow intelligence.`,
                    offers: {
                        '@type': 'Offer',
                        price: '49.00',
                        priceCurrency: 'USD',
                        availability: 'https://schema.org/InStock',
                        url: `https://${hostname}/pricing`,
                    },
                }, null, 2),
                resolved: 0,
            });
        }
        // Persist findings to PostgreSQL if available
        try {
            for (const finding of generatedFindings) {
                await db.insert(auditFindings).values({
                    id: finding.id,
                    auditId: finding.auditId,
                    issue: finding.issue,
                    category: finding.category,
                    severity: finding.severity,
                    impact: finding.impact,
                    effort: finding.effort,
                    recommendedFix: finding.recommendedFix,
                    codeSnippet: finding.codeSnippet,
                    resolved: 0,
                }).onConflictDoNothing();
            }
        }
        catch {
            // Ignored if DB is in memory mode
        }
        const completed = await updateStatus('COMPLETED', {
            visibilityScore: result.visibilityScore,
            technicalScore: result.technicalScore,
            findings: generatedFindings,
            crawledPages: result.crawledPages,
        });
        return completed;
    }
    catch (err) {
        console.error(`[Crawler] Job ${auditId} failed:`, err.message);
        const failed = await updateStatus('FAILED', {
            error: err.message,
        });
        return failed;
    }
}
// BullMQ worker for Redis queue
export const crawlerWorker = new Worker('citable-crawl', async (job) => {
    return await executeCrawlJob(job.data);
}, {
    connection: redis,
    concurrency: 2,
});
crawlerWorker.on('error', (err) => {
    // Gracefully handle worker errors without unhandled rejection
    console.warn('[BullMQ Worker Notice]', err.message);
});

import { Worker } from 'bullmq';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { redis } from './queue.js';
import { calculateTechnicalScore, validateTargetUrl } from './security.js';
const MAX_PAGES = 25;
async function fetchPage(url) {
    const target = validateTargetUrl(url);
    const response = await axios.get(target.toString(), {
        timeout: 5000,
        maxRedirects: 3,
        headers: {
            'User-Agent': 'Mozilla/5.0 CitableCrawler/1.0',
            Accept: 'text/html,application/xhtml+xml',
        },
    });
    return {
        url: target.toString(),
        html: response.data,
        status: response.status,
    };
}
function extractMetadata(html) {
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content') ?? '';
    const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => $(el).text().trim()).get();
    const canonical = $('link[rel="canonical"]').attr('href') ?? '';
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).contents().text().trim();
        if (content)
            schemas.push(content);
    });
    return {
        title,
        description,
        headings,
        canonical,
        schemaCount: schemas.length,
        hasProductSchema: schemas.some((schema) => /Product/i.test(schema)),
        hasFaqSchema: schemas.some((schema) => /FAQPage/i.test(schema)),
    };
}
async function crawlSite(domain) {
    const queue = [domain];
    const visited = new Set();
    const pages = [];
    while (queue.length > 0 && pages.length < MAX_PAGES) {
        const current = queue.shift();
        if (visited.has(current))
            continue;
        visited.add(current);
        try {
            const page = await fetchPage(current);
            pages.push(page.url);
            const $ = cheerio.load(page.html);
            $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                if (!href || href.startsWith('#'))
                    return;
                try {
                    const next = new URL(href, current).toString();
                    if (next.startsWith('http') && !visited.has(next) && queue.length < MAX_PAGES) {
                        queue.push(next);
                    }
                }
                catch {
                    // ignore malformed URLs
                }
            });
        }
        catch {
            // ignore a single failing page during MVP crawl
        }
    }
    const pageData = await Promise.all(pages.map(async (url) => {
        const content = await fetchPage(url);
        return extractMetadata(content.html);
    }));
    const criticalFindings = pageData.filter((page) => !page.title || !page.description).length;
    const warnings = pageData.filter((page) => page.schemaCount === 0).length;
    const technicalScore = calculateTechnicalScore({ criticalFindings, warnings });
    return {
        crawledPages: pages.length,
        technicalScore,
        metadata: pageData,
        visibilityScore: Math.min(100, Math.max(45, Math.round((technicalScore + (pageData.filter((page) => page.hasProductSchema).length * 10)) / 1.2))),
    };
}
export const crawlerWorker = new Worker('citable-crawl', async (job) => {
    const { auditId, domain } = job.data;
    const result = await crawlSite(domain);
    return {
        auditId,
        status: 'COMPLETED',
        visibilityScore: result.visibilityScore,
        technicalScore: result.technicalScore,
        findings: [
            {
                id: `finding-${auditId}-1`,
                title: result.metadata[0]?.title ? 'Title and description quality are present' : 'Missing title or meta description',
                severity: 'HIGH',
                impact: 90,
                effort: 'LOW',
                recommendation: 'Add a unique, descriptive <title> and meta description for the homepage.',
            },
            {
                id: `finding-${auditId}-2`,
                title: result.metadata.some((page) => page.hasProductSchema) ? 'Structured product data is detected' : 'Missing Product schema markup',
                severity: 'HIGH',
                impact: 88,
                effort: 'MEDIUM',
                recommendation: 'Add JSON-LD Product schema with name, price, currency, and offer details.',
            },
        ],
        result,
    };
}, { connection: redis });

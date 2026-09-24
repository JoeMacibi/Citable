const REQUIRED_FIELDS = [
    'name',
    'description',
    'image',
    'offers',
    'price',
    'priceCurrency',
    'availability',
    'sku',
];
export function analyzeProductSchema(product) {
    const candidate = product ?? {};
    const checks = REQUIRED_FIELDS.map((field) => {
        const value = candidate[field];
        const hasValue = value !== undefined && value !== null && value !== '';
        return {
            field,
            present: hasValue,
            details: hasValue ? `${field} is populated` : `${field} is missing`,
        };
    });
    const presentCount = checks.filter((check) => check.present).length;
    const score = Math.min(100, Math.round((presentCount / REQUIRED_FIELDS.length) * 100));
    const missing = checks.filter((check) => !check.present).map((check) => check.field);
    const summary = missing.length === 0
        ? 'All required Product schema fields are present.'
        : `Missing required Product schema fields: ${missing.join(', ')}.`;
    return { score, checks, summary };
}
export function buildProductSchemaSnippet(product) {
    const name = String(product.name ?? 'Product');
    const description = String(product.description ?? 'A premium product for modern buyers.');
    const price = Number(product.price ?? 49) || 49;
    const currency = String(product.currency ?? 'USD');
    const sku = String(product.sku ?? 'SKU-001');
    const url = String(product.url ?? 'https://example.com/product');
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        image: 'https://example.com/og-image.jpg',
        sku,
        offers: {
            '@type': 'Offer',
            url,
            price: String(price),
            priceCurrency: currency,
            availability: 'https://schema.org/InStock',
        },
    }, null, 2);
}

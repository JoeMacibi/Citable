export function validateTargetUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        throw new Error('Invalid URL provided for crawl');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http and https protocols are allowed');
    }
    const hostname = parsed.hostname.toLowerCase();
    const forbiddenHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (forbiddenHosts.includes(hostname)) {
        throw new Error('Localhost and loopback targets are blocked for SSRF safety');
    }
    if (hostname === '169.254.169.254') {
        throw new Error('AWS metadata endpoint access is blocked');
    }
    const ipv4 = parsed.hostname;
    const privateRanges = [
        /^10\./,
        /^127\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^0\.0\.0\.0$/,
    ];
    if (privateRanges.some((range) => range.test(ipv4))) {
        throw new Error('Private CIDR ranges are blocked for SSRF safety');
    }
    return parsed;
}
export function calculateTechnicalScore(args) {
    return Math.max(0, 100 - args.criticalFindings * 15 - args.warnings * 5);
}

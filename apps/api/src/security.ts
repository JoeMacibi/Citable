import dns from 'node:dns/promises';
import { isIP } from 'node:net';

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function isPrivateOrBlockedIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  let cleanIp = ip.toLowerCase();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  // Check IPv4
  const ipType = isIP(cleanIp);
  if (ipType === 4) {
    const parts = cleanIp.split('.').map(Number);
    const [b0, b1, b2, b3] = parts;

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (b0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-local & AWS/Cloud metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (b0 === 192 && b1 === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 198.18.0.0/15 (Network benchmark testing)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 198.51.100.0/24 / 203.0.113.0/24 / 192.0.2.0/24 (documentation ranges)
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;
    if (b0 === 192 && b1 === 0 && b2 === 2) return true;
    // 224.0.0.0/4 multicast, 255.255.255.255/32 broadcast
    if (b0 >= 224 || b0 === 255) return true;
    // 192.0.0.0/24 is reserved for IETF protocol assignments.
    if (b0 === 192 && b1 === 0 && b2 === 0) return true;
    // 192.88.99.0/24 is 6to4 relay anycast; treat as blocked.
    if (b0 === 192 && b1 === 88 && b2 === 99) return true;

    return false;
  }

  // Check IPv6
  if (ipType === 6) {
    // Loopback / unspecified
    if (cleanIp === '::1' || cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:1' || cleanIp === '0:0:0:0:0:0:0:0') {
      return true;
    }
    // Unique Local Addresses (fc00::/7)
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) {
      return true;
    }
    // Link-local unicast (fe80::/10)
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) {
      return true;
    }
    // Multicast (ff00::/8) and reserved IPv6 ranges are blocked too.
    if (/^ff[0-9a-f]{2}:/i.test(cleanIp)) {
      return true;
    }
    return false;
  }

  return false;
}

export async function validateTargetUrl(rawUrl: string): Promise<URL> {
  const normalized = normalizeUrl(rawUrl);
  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Invalid URL provided for crawl');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https protocols are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  const forbiddenHostnames = [
    'localhost',
    'metadata.google.internal',
    '169.254.169.254',
  ];

  if (forbiddenHostnames.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`Target ${hostname} is blocked for SSRF safety`);
  }

  // If the hostname itself is a literal IP address, validate immediately
  if (isIP(hostname)) {
    if (isPrivateOrBlockedIp(hostname)) {
      throw new Error(`IP address ${hostname} is blocked for SSRF safety`);
    }
    return parsed;
  }

  // Perform DNS resolution to detect DNS rebinding and internal IP mapping
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Unable to resolve host ${hostname}`);
    }

    for (const record of addresses) {
      if (isPrivateOrBlockedIp(record.address)) {
        throw new Error(`Resolved IP address ${record.address} for host ${hostname} is blocked for SSRF safety`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('SSRF safety')) {
      throw err;
    }
    throw new Error(`DNS resolution failed for ${hostname}: ${err.message}`);
  }

  return parsed;
}

export function calculateTechnicalScore(args: { criticalFindings: number; warnings: number }): number {
  return Math.max(0, 100 - args.criticalFindings * 15 - args.warnings * 5);
}

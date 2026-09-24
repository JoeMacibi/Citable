import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTechnicalScore, isPrivateOrBlockedIp, normalizeUrl, validateTargetUrl, } from './security.js';
test('normalizeUrl auto-prefixes https protocol if missing', () => {
    assert.equal(normalizeUrl('example.com'), 'https://example.com');
    assert.equal(normalizeUrl('http://example.com/test'), 'http://example.com/test');
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
    assert.throws(() => normalizeUrl('   '), /cannot be empty/i);
});
test('isPrivateOrBlockedIp detects private, loopback, and metadata ranges', () => {
    assert.equal(isPrivateOrBlockedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('127.255.255.255'), true);
    assert.equal(isPrivateOrBlockedIp('10.0.0.5'), true);
    assert.equal(isPrivateOrBlockedIp('172.20.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('192.168.1.1'), true);
    assert.equal(isPrivateOrBlockedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrBlockedIp('198.51.100.10'), true);
    assert.equal(isPrivateOrBlockedIp('0.0.0.0'), true);
    assert.equal(isPrivateOrBlockedIp('::1'), true);
    assert.equal(isPrivateOrBlockedIp('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('::ffff:169.254.169.254'), true);
    assert.equal(isPrivateOrBlockedIp('fe80::1'), true);
    // Public IPs
    assert.equal(isPrivateOrBlockedIp('8.8.8.8'), false);
    assert.equal(isPrivateOrBlockedIp('1.1.1.1'), false);
    assert.equal(isPrivateOrBlockedIp('93.184.216.34'), false);
});
test('validateTargetUrl blocks private and metadata endpoints', async () => {
    await assert.rejects(async () => validateTargetUrl('http://127.0.0.1:3000'), /blocked for SSRF/i);
    await assert.rejects(async () => validateTargetUrl('http://10.0.0.5'), /blocked for SSRF/i);
    await assert.rejects(async () => validateTargetUrl('http://169.254.169.254/latest/meta-data/'), /blocked for SSRF/i);
    await assert.rejects(async () => validateTargetUrl('http://localhost:8080'), /blocked for SSRF/i);
    await assert.rejects(async () => validateTargetUrl('http://metadata.google.internal'), /blocked for SSRF/i);
});
test('validateTargetUrl accepts valid public domains', async () => {
    const parsed = await validateTargetUrl('https://example.com');
    assert.equal(parsed.hostname, 'example.com');
    assert.equal(parsed.protocol, 'https:');
});
test('calculates technical score from findings', () => {
    assert.equal(calculateTechnicalScore({ criticalFindings: 2, warnings: 3 }), 55);
    assert.equal(calculateTechnicalScore({ criticalFindings: 0, warnings: 0 }), 100);
    assert.equal(calculateTechnicalScore({ criticalFindings: 10, warnings: 5 }), 0);
});

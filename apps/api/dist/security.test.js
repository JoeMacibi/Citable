import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTechnicalScore, validateTargetUrl } from './security.js';
test('rejects localhost and private ranges before fetching a URL', () => {
    assert.throws(() => validateTargetUrl('http://127.0.0.1:3000'), /private|localhost/i);
    assert.throws(() => validateTargetUrl('http://10.0.0.5'), /private|cidr/i);
    assert.throws(() => validateTargetUrl('http://169.254.169.254/latest/meta-data/'), /metadata/i);
});
test('calculates technical score from findings', () => {
    assert.equal(calculateTechnicalScore({ criticalFindings: 2, warnings: 3 }), 55);
    assert.equal(calculateTechnicalScore({ criticalFindings: 0, warnings: 0 }), 100);
});

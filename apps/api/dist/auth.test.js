import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, getSessionCookie, hashPassword, normalizeEmail, verifyPassword } from './auth.js';
test('normalizes signup email addresses', () => {
    assert.equal(normalizeEmail('  PERSON@Example.COM '), 'person@example.com');
});
test('hashes and verifies passwords without storing the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    assert.notEqual(hash, 'correct horse battery staple');
    assert.equal(await verifyPassword('correct horse battery staple', hash), true);
    assert.equal(await verifyPassword('wrong password', hash), false);
});
test('creates an http-only session cookie', () => {
    const token = createSessionToken({ userId: 7, organizationId: 3, email: 'person@example.com' });
    const cookie = getSessionCookie(token);
    assert.match(cookie, /^citable_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=604800/);
});

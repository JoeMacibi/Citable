import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const PASSWORD_ROUNDS = 12;
export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
export async function hashPassword(password) {
    return bcrypt.hash(password, PASSWORD_ROUNDS);
}
export async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be configured in production');
    }
    return secret ?? 'citable-development-only-secret';
}
export function createSessionToken(claims) {
    return jwt.sign(claims, getJwtSecret(), { expiresIn: '7d' });
}
export function getSessionCookie(token) {
    const isProduction = process.env.NODE_ENV === 'production';
    return [
        `citable_session=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=604800',
        isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');
}

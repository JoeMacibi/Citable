import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const PASSWORD_ROUNDS = 12;

export type AuthClaims = {
  userId: number;
  organizationId: number;
  email: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
  return secret ?? 'citable-development-only-secret';
}

export function createSessionToken(claims: AuthClaims): string {
  return jwt.sign(claims, getJwtSecret(), { expiresIn: '7d' });
}

export function getSessionCookie(token: string): string {
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
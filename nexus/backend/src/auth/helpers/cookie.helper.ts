import { Response } from 'express';
import * as crypto from 'crypto';

export function setAuthCookies(
  res: Response,
  token: string,
  refreshToken?: string,
) {
  res.cookie('nexus_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/',
  });

  if (refreshToken) {
    res.cookie('nexus_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  // FIX-AUTH-08: sameSite changed from 'strict' to 'lax'.
  // 'strict' blocked the CSRF cookie on top-level navigations from external origins
  // (e.g., clicking a link from an email). 'lax' allows it on top-level GET navigations
  // while still blocking cross-site POST/PUT/PATCH/DELETE — which is the correct threat model.
  // Non-httpOnly so frontend can read it to send X-CSRF-Token header.
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('nexus-csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('nexus_token');
  res.clearCookie('nexus_refresh');
}

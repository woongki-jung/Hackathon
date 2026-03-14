import type { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'domain-dict-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24시간 (AUTH-R-010)
  },
};

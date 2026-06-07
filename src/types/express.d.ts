import { Request } from "express";

export interface CustomJwtPayload {
  id: string;
  user_role: string;
  company_id: string | null;
  email?: string;
}

// Interface for your cookie structure
export interface AppCookies {
  sessionId?: string;
  userToken?: string;
  theme?: 'light' | 'dark';
}

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
      // Injecting typed cookies into the Request object
      cookies: AppCookies;
      signedCookies: AppCookies;
    }
  }
}

import { load, save } from "./store";
import { httpGetAuth, httpPostForm, httpReq } from "./api";

export interface GoogleCreds {
  clientId: string;
  clientSecret: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // ms epoch
}

export const CREDS_KEY = "sela.google.creds";
export const TOKENS_KEY = "sela.google.tokens";

const REDIRECT_URI = "http://localhost";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function authUrl(creds: GoogleCreds, scopes: string[]): string {
  const p = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export async function exchangeCode(
  creds: GoogleCreds,
  code: string,
): Promise<GoogleTokens> {
  const raw = await httpPostForm(TOKEN_URL, {
    code: code.trim(),
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const j = JSON.parse(raw) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (j.error) throw new Error(j.error_description ?? j.error);
  const tokens: GoogleTokens = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  // Pertahankan refresh token lama bila respons tidak membawa yang baru.
  const old = load<GoogleTokens | null>(TOKENS_KEY, null);
  if (!tokens.refresh_token && old?.refresh_token) {
    tokens.refresh_token = old.refresh_token;
  }
  save(TOKENS_KEY, tokens);
  return tokens;
}

/** Token akses yang masih berlaku; refresh otomatis bila kedaluwarsa. */
export async function validAccessToken(): Promise<string | null> {
  const creds = load<GoogleCreds | null>(CREDS_KEY, null);
  const tokens = load<GoogleTokens | null>(TOKENS_KEY, null);
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token;
  if (!tokens.refresh_token || !creds) return null;
  const raw = await httpPostForm(TOKEN_URL, {
    refresh_token: tokens.refresh_token,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "refresh_token",
  });
  const j = JSON.parse(raw) as {
    access_token: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (j.error) throw new Error(j.error_description ?? j.error);
  const next: GoogleTokens = {
    access_token: j.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  save(TOKENS_KEY, next);
  return next.access_token;
}

export function isGoogleConnected(): boolean {
  return load<GoogleTokens | null>(TOKENS_KEY, null) !== null;
}

export async function disconnectGoogle(): Promise<void> {
  const tokens = load<GoogleTokens | null>(TOKENS_KEY, null);
  if (tokens?.access_token) {
    try {
      await httpPostForm(REVOKE_URL, { token: tokens.access_token });
    } catch {
      // abaikan — hapus lokal saja
    }
  }
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    // abaikan
  }
}

export async function googleGet<T>(url: string): Promise<T> {
  const token = await validAccessToken();
  if (!token) throw new Error("Belum terhubung ke Google.");
  return JSON.parse(await httpGetAuth(url, token)) as T;
}

export async function googleReq<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const token = await validAccessToken();
  if (!token) throw new Error("Belum terhubung ke Google.");
  const raw = await httpReq(
    method,
    url,
    body === undefined ? undefined : JSON.stringify(body),
    "application/json",
    token,
  );
  return raw ? (JSON.parse(raw) as T) : (undefined as T);
}

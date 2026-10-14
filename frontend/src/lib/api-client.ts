import { TokenResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

/**
 * Standard API error carrying HTTP status code and response body.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Retrieves the stored JWT access token from browser storage.
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_access_token');
}

/**
 * Retrieves the stored JWT refresh token from browser storage.
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_refresh_token');
}

/**
 * Persists newly acquired access and refresh tokens in browser storage.
 */
export function setStoredTokens(tokens: TokenResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('crm_access_token', tokens.access_token);
  localStorage.setItem('crm_refresh_token', tokens.refresh_token);
}

/**
 * Clears stored authentication session tokens and cached user data.
 */
export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('crm_access_token');
  localStorage.removeItem('crm_refresh_token');
  localStorage.removeItem('crm_user');
}

/**
 * Performs a silent token refresh using the stored refresh token.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    const data: TokenResponse = await res.json();
    setStoredTokens(data);
    return data.access_token;
  } catch {
    clearStoredTokens();
    return null;
  }
}

/**
 * Enterprise HTTP client with automatic Bearer token injection and silent 401 refresh retries.
 *
 * @param endpoint Relative API endpoint (e.g., '/users') or full URL.
 * @param options Standard RequestInit fetch options.
 * @returns Parsed JSON response.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized with silent token refresh
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryRes = await fetch(url, { ...options, headers });
        if (!retryRes.ok) {
          const errData = await retryRes.json().catch(() => ({}));
          throw new ApiError(
            retryRes.status,
            errData.detail || 'Request failed after refresh',
            errData
          );
        }
        if (retryRes.status === 204 || retryRes.status === 205) {
          return undefined as T;
        }
        return (await retryRes.json()) as T;
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(url, { ...options, headers });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              reject(
                new ApiError(retryRes.status, errData.detail || 'Request failed', errData)
              );
            } else if (retryRes.status === 204 || retryRes.status === 205) {
              resolve(undefined as T);
            } else {
              resolve((await retryRes.json()) as T);
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.detail || `HTTP Error ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, message, errorData);
  }

  // Handle empty bodies (204 No Content, 205 Reset Content)
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

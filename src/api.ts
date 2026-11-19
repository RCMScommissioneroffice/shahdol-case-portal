export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TOKEN_STORAGE_KEY = 'shahdol_auth_token';
let memoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors inside restricted iframes; memoryToken remains active
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) memoryToken = stored;
    return stored;
  } catch {
    return memoryToken;
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function withAuthToken(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = getAuthToken();
  const headers: Record<string, string> = isFormData
    ? { ...(options.headers as Record<string, string> | undefined) }
    : {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined)
      };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/login')) {
      clearAuthToken();
      if (url !== '/api/auth/me' && unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status);
  }

  return data as T;
}

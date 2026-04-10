const URLS = {
  auth:    'https://functions.poehali.dev/61dedd83-5c5e-4d8f-bb3f-403446321939',
  users:   'https://functions.poehali.dev/22f2fc4c-854e-4d23-9972-31df3dc52d2c',
  servers: 'https://functions.poehali.dev/37e5c79e-2032-4382-bb5e-eb9acf845120',
  logs:    'https://functions.poehali.dev/42d0590b-f3b2-4980-9647-57d0147022db',
};

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  plan: string;
  status: string;
  registered_at: string | null;
  last_seen: string | null;
  active_connections: number;
}

export interface ApiServer {
  id: string;
  name: string;
  country: string;
  city: string;
  flag: string;
  ip: string;
  load: number;
  status: string;
  recommended: boolean;
  latency: number;
  uptime: number;
  last_check: string | null;
  connections: number;
  bandwidth: number;
}

export interface ApiLog {
  id: string;
  action: string;
  resource: string | null;
  ip: string | null;
  meta: Record<string, unknown>;
  timestamp: string;
  user: string | null;
}

const TOKEN_KEY = 'admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch(url: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader(),
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const adminApi = {
  async login(email: string, password: string): Promise<AdminProfile> {
    const data = await apiFetch(`${URLS.auth}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return { id: '', email: data.email, name: data.name, is_admin: true };
  },

  async me(): Promise<AdminProfile> {
    return apiFetch(`${URLS.auth}/me`);
  },

  async logout(): Promise<void> {
    await apiFetch(`${URLS.auth}/logout`, { method: 'POST' }).catch(() => {});
    clearToken();
  },

  async getUsers(): Promise<ApiUser[]> {
    const data = await apiFetch(URLS.users);
    return data.users;
  },

  async blockUser(id: string): Promise<void> {
    await apiFetch(`${URLS.users}/${id}/block`, { method: 'PUT' });
  },

  async unblockUser(id: string): Promise<void> {
    await apiFetch(`${URLS.users}/${id}/unblock`, { method: 'PUT' });
  },

  async getServers(): Promise<ApiServer[]> {
    const data = await apiFetch(URLS.servers);
    return data.servers;
  },

  async toggleServer(id: string): Promise<string> {
    const data = await apiFetch(`${URLS.servers}/${id}/toggle`, { method: 'PUT' });
    return data.status;
  },

  async getLogs(): Promise<ApiLog[]> {
    const data = await apiFetch(URLS.logs);
    return data.logs;
  },
};

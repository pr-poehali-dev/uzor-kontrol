const VPN_CONNECT_URL = 'https://functions.poehali.dev/2e641a39-0f6e-4fc1-a038-bdce4757eaf0';
const TOKEN_KEY = 'vpn_token';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface Server {
  id: string;
  name: string;
  country: string;
  city: string;
  flag: string;
  latency: number;
  load: number;
  online: boolean;
  recommended?: boolean;
  available?: boolean;
}

export interface ConnectionState {
  status: ConnectionStatus;
  server: Server | null;
  latency: number;
  downloadSpeed: number;
  uploadSpeed: number;
  connectedAt: Date | null;
}

export interface VpnConfig {
  config: string;
  client_ip: string;
  qr_data: string;
  server_id?: string;
  created_at?: string;
}

export const FALLBACK_SERVER: Server = {
  id: 'a383e9f8-a6a1-4c7b-b34f-5e206bb3e122',
  name: 'EU West',
  country: 'Germany',
  city: 'Frankfurt',
  flag: '🇩🇪',
  latency: 28,
  load: 45,
  online: true,
  recommended: true,
  available: true,
};

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { 'X-Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const api = {
  async listServers(): Promise<Server[]> {
    const res = await fetch(VPN_CONNECT_URL + '?list=servers', { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить серверы');
    return data.servers as Server[];
  },

  async checkSession(): Promise<{ active: boolean; server?: Server }> {
    await new Promise(r => setTimeout(r, 500));
    return { active: false };
  },

  async connect(serverId: string): Promise<VpnConfig> {
    const res = await fetch(VPN_CONNECT_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'connect', server_id: serverId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось подключиться');
    return data;
  },

  async disconnect(serverId: string): Promise<{ ok: boolean }> {
    const res = await fetch(VPN_CONNECT_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'disconnect', server_id: serverId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось отключиться');
    return data;
  },

  async getConfigs(): Promise<{ configs: VpnConfig[] }> {
    const res = await fetch(VPN_CONNECT_URL, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
    return data;
  },

  async login(email: string, password: string): Promise<{ success: boolean; token?: string }> {
    await new Promise(r => setTimeout(r, 1000));
    if (email && password) return { success: true, token: 'mock-token-123' };
    return { success: false };
  },

  async register(email: string, password: string): Promise<{ success: boolean }> {
    await new Promise(r => setTimeout(r, 1000));
    return { success: true };
  },
};
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

export const MOCK_SERVERS: Server[] = [
  { id: 'a383e9f8-a6a1-4c7b-b34f-5e206bb3e122', name: 'EU West', country: 'Germany', city: 'Frankfurt', flag: '🇩🇪', latency: 28, load: 45, online: true, recommended: true },
  { id: '3a60e5ec-5256-4d15-a7ab-938c8ac2587e', name: 'US East', country: 'United States', city: 'New York', flag: '🇺🇸', latency: 12, load: 23, online: true },
  { id: '93cb50ea-843a-4c63-addf-92e1ab233733', name: 'Asia Pacific', country: 'Japan', city: 'Tokyo', flag: '🇯🇵', latency: 67, load: 31, online: true },
  { id: '0a3a7b7c-874c-43bc-9b98-1829a24a9d7c', name: 'UK London', country: 'United Kingdom', city: 'London', flag: '🇬🇧', latency: 35, load: 62, online: true },
  { id: 'ae17d96a-9604-4cf9-befd-ac4bdbaf39fc', name: 'CA Toronto', country: 'Canada', city: 'Toronto', flag: '🇨🇦', latency: 22, load: 18, online: true },
  { id: '2ba116de-32fe-4453-b8d0-135ce334c64f', name: 'AU Sydney', country: 'Australia', city: 'Sydney', flag: '🇦🇺', latency: 145, load: 77, online: true },
  { id: '52afe5f6-fb0d-4387-a2b1-88264b875508', name: 'SG Singapore', country: 'Singapore', city: 'Singapore', flag: '🇸🇬', latency: 89, load: 55, online: false },
  { id: 'e63181cb-d46f-46c8-a74b-6f3ec685622f', name: 'NL Amsterdam', country: 'Netherlands', city: 'Amsterdam', flag: '🇳🇱', latency: 31, load: 40, online: true },
];

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { 'X-Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const api = {
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
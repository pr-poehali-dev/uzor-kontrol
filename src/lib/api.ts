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

export const MOCK_SERVERS: Server[] = [
  { id: '1', name: 'US East', country: 'United States', city: 'New York', flag: '🇺🇸', latency: 12, load: 23, online: true, recommended: true },
  { id: '2', name: 'EU West', country: 'Germany', city: 'Frankfurt', flag: '🇩🇪', latency: 28, load: 45, online: true },
  { id: '3', name: 'Asia Pacific', country: 'Japan', city: 'Tokyo', flag: '🇯🇵', latency: 67, load: 31, online: true },
  { id: '4', name: 'UK London', country: 'United Kingdom', city: 'London', flag: '🇬🇧', latency: 35, load: 62, online: true },
  { id: '5', name: 'CA Toronto', country: 'Canada', city: 'Toronto', flag: '🇨🇦', latency: 22, load: 18, online: true },
  { id: '6', name: 'AU Sydney', country: 'Australia', city: 'Sydney', flag: '🇦🇺', latency: 145, load: 77, online: true },
  { id: '7', name: 'SG Singapore', country: 'Singapore', city: 'Singapore', flag: '🇸🇬', latency: 89, load: 55, online: false },
  { id: '8', name: 'NL Amsterdam', country: 'Netherlands', city: 'Amsterdam', flag: '🇳🇱', latency: 31, load: 40, online: true },
];

export const api = {
  async checkSession(): Promise<{ active: boolean; server?: Server }> {
    await new Promise(r => setTimeout(r, 500));
    return { active: false };
  },

  async connect(serverId: string): Promise<{ success: boolean }> {
    await new Promise(r => setTimeout(r, 2000));
    return { success: true };
  },

  async disconnect(): Promise<{ success: boolean }> {
    await new Promise(r => setTimeout(r, 800));
    return { success: true };
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

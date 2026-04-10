export interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'business';
  status: 'active' | 'blocked' | 'expired';
  registeredAt: string;
  lastSeen: string;
  country: string;
  activeConnections: number;
}

export interface AdminServer {
  id: string;
  name: string;
  country: string;
  city: string;
  flag: string;
  ip: string;
  status: 'online' | 'maintenance' | 'offline';
  load: number;
  latency: number;
  uptime: number;
  connections: number;
  bandwidth: number;
}

export interface LogEntry {
  id: string;
  type: 'connection' | 'error' | 'auth' | 'admin';
  message: string;
  user?: string;
  server?: string;
  ip?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
}

export interface MetricPoint {
  time: string;
  value: number;
}

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function timeAgo(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60000);
  return d.toISOString();
}

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: 'u1', email: 'alex.morgan@gmail.com', name: 'Alex Morgan', plan: 'pro', status: 'active', registeredAt: '2024-11-03', lastSeen: timeAgo(5), country: 'US', activeConnections: 1 },
  { id: 'u2', email: 'lena.kraft@mail.ru', name: 'Lena Kraft', plan: 'business', status: 'active', registeredAt: '2024-08-17', lastSeen: timeAgo(2), country: 'DE', activeConnections: 2 },
  { id: 'u3', email: 'dmitry.volkov@yandex.ru', name: 'Dmitry Volkov', plan: 'free', status: 'active', registeredAt: '2025-01-22', lastSeen: timeAgo(120), country: 'RU', activeConnections: 0 },
  { id: 'u4', email: 'sarah.chen@outlook.com', name: 'Sarah Chen', plan: 'pro', status: 'blocked', registeredAt: '2024-06-10', lastSeen: timeAgo(4320), country: 'SG', activeConnections: 0 },
  { id: 'u5', email: 'james.wilson@proton.me', name: 'James Wilson', plan: 'pro', status: 'active', registeredAt: '2025-02-08', lastSeen: timeAgo(15), country: 'GB', activeConnections: 1 },
  { id: 'u6', email: 'yuki.tanaka@docomo.ne', name: 'Yuki Tanaka', plan: 'business', status: 'active', registeredAt: '2024-12-01', lastSeen: timeAgo(30), country: 'JP', activeConnections: 3 },
  { id: 'u7', email: 'marco.rossi@libero.it', name: 'Marco Rossi', plan: 'free', status: 'expired', registeredAt: '2024-07-15', lastSeen: timeAgo(2880), country: 'IT', activeConnections: 0 },
  { id: 'u8', email: 'anna.petrov@gmail.com', name: 'Anna Petrov', plan: 'pro', status: 'active', registeredAt: '2025-03-12', lastSeen: timeAgo(8), country: 'UA', activeConnections: 1 },
  { id: 'u9', email: 'carlos.mendez@hotmail.com', name: 'Carlos Mendez', plan: 'free', status: 'active', registeredAt: '2025-03-28', lastSeen: timeAgo(60), country: 'MX', activeConnections: 0 },
  { id: 'u10', email: 'sophie.dubois@orange.fr', name: 'Sophie Dubois', plan: 'business', status: 'active', registeredAt: '2024-09-20', lastSeen: timeAgo(45), country: 'FR', activeConnections: 2 },
  { id: 'u11', email: 'farid.hassan@gmail.com', name: 'Farid Hassan', plan: 'pro', status: 'active', registeredAt: '2025-01-05', lastSeen: timeAgo(180), country: 'AE', activeConnections: 1 },
  { id: 'u12', email: 'nina.bosch@gmail.com', name: 'Nina Bosch', plan: 'free', status: 'blocked', registeredAt: '2024-10-11', lastSeen: timeAgo(5760), country: 'NL', activeConnections: 0 },
];

export const MOCK_ADMIN_SERVERS: AdminServer[] = [
  { id: 's1', name: 'US East #1', country: 'United States', city: 'New York', flag: '🇺🇸', ip: '185.220.101.12', status: 'online', load: 23, latency: 12, uptime: 99.98, connections: 847, bandwidth: 2.4 },
  { id: 's2', name: 'US West #1', country: 'United States', city: 'Los Angeles', flag: '🇺🇸', ip: '185.220.101.15', status: 'online', load: 41, latency: 18, uptime: 99.95, connections: 1203, bandwidth: 3.7 },
  { id: 's3', name: 'EU Central #1', country: 'Germany', city: 'Frankfurt', flag: '🇩🇪', ip: '91.108.56.201', status: 'online', load: 67, latency: 28, uptime: 99.92, connections: 2104, bandwidth: 5.1 },
  { id: 's4', name: 'EU North #1', country: 'Netherlands', city: 'Amsterdam', flag: '🇳🇱', ip: '91.108.56.230', status: 'online', load: 38, latency: 31, uptime: 99.99, connections: 987, bandwidth: 2.8 },
  { id: 's5', name: 'UK London #1', country: 'United Kingdom', city: 'London', flag: '🇬🇧', ip: '185.234.218.5', status: 'online', load: 55, latency: 35, uptime: 99.87, connections: 1456, bandwidth: 4.2 },
  { id: 's6', name: 'AP Japan #1', country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ip: '103.195.103.10', status: 'online', load: 29, latency: 67, uptime: 99.94, connections: 654, bandwidth: 1.9 },
  { id: 's7', name: 'AP Singapore #1', country: 'Singapore', city: 'Singapore', flag: '🇸🇬', ip: '103.195.103.44', status: 'maintenance', load: 0, latency: 89, uptime: 98.12, connections: 0, bandwidth: 0 },
  { id: 's8', name: 'CA Toronto #1', country: 'Canada', city: 'Toronto', flag: '🇨🇦', ip: '198.245.60.7', status: 'online', load: 18, latency: 22, uptime: 99.97, connections: 423, bandwidth: 1.2 },
  { id: 's9', name: 'AU Sydney #1', country: 'Australia', city: 'Sydney', flag: '🇦🇺', ip: '103.195.106.21', status: 'online', load: 72, latency: 145, uptime: 99.78, connections: 321, bandwidth: 0.9 },
  { id: 's10', name: 'FR Paris #1', country: 'France', city: 'Paris', flag: '🇫🇷', ip: '91.108.58.100', status: 'offline', load: 0, latency: 0, uptime: 94.30, connections: 0, bandwidth: 0 },
];

const logMessages = [
  { type: 'connection' as const, level: 'info' as const, msg: (u: string, s: string) => `${u} connected to ${s}` },
  { type: 'connection' as const, level: 'info' as const, msg: (u: string, s: string) => `${u} disconnected from ${s}` },
  { type: 'error' as const, level: 'error' as const, msg: (_: string, s: string) => `Timeout on ${s}: connection dropped` },
  { type: 'auth' as const, level: 'warn' as const, msg: (u: string) => `Failed login attempt for ${u}` },
  { type: 'auth' as const, level: 'info' as const, msg: (u: string) => `${u} authenticated successfully` },
  { type: 'error' as const, level: 'error' as const, msg: (_: string, s: string) => `High load alert on ${s}: ${rng(80, 99)}%` },
  { type: 'admin' as const, level: 'info' as const, msg: (u: string, s: string) => `Admin toggled server ${s}` },
  { type: 'connection' as const, level: 'warn' as const, msg: (u: string) => `${u} switched server mid-session` },
];

export const MOCK_LOGS: LogEntry[] = Array.from({ length: 50 }, (_, i) => {
  const template = logMessages[i % logMessages.length];
  const user = MOCK_ADMIN_USERS[i % MOCK_ADMIN_USERS.length].email;
  const server = MOCK_ADMIN_SERVERS[i % MOCK_ADMIN_SERVERS.length].name;
  return {
    id: `log-${i}`,
    type: template.type,
    level: template.level,
    message: template.msg(user, server),
    user,
    server,
    ip: `${rng(10, 200)}.${rng(0, 255)}.${rng(0, 255)}.${rng(1, 254)}`,
    timestamp: timeAgo(i * 3),
  };
});

function generateTimeSeries(hours: number, base: number, variance: number): MetricPoint[] {
  return Array.from({ length: hours }, (_, i) => {
    const d = new Date(Date.now() - (hours - i) * 3600000);
    const label = d.getHours().toString().padStart(2, '0') + ':00';
    return { time: label, value: Math.max(0, base + Math.floor((Math.random() - 0.5) * variance)) };
  });
}

export const METRICS = {
  connectionsOverTime: generateTimeSeries(24, 4200, 2000),
  bandwidthOverTime: generateTimeSeries(24, 18, 12),
  errorsOverTime: generateTimeSeries(24, 3, 6),
  serverLatency: MOCK_ADMIN_SERVERS.filter(s => s.status === 'online').map(s => ({
    name: s.name.replace(' #1', ''),
    latency: s.latency,
  })),
  serverLoad: MOCK_ADMIN_SERVERS.filter(s => s.status === 'online').map(s => ({
    name: s.name.replace(' #1', ''),
    load: s.load,
  })),
};

export const STATS = {
  totalUsers: MOCK_ADMIN_USERS.length,
  activeUsers: MOCK_ADMIN_USERS.filter(u => u.status === 'active').length,
  activeConnections: MOCK_ADMIN_USERS.reduce((acc, u) => acc + u.activeConnections, 0),
  totalServers: MOCK_ADMIN_SERVERS.length,
  onlineServers: MOCK_ADMIN_SERVERS.filter(s => s.status === 'online').length,
  avgLoad: Math.round(MOCK_ADMIN_SERVERS.filter(s => s.status === 'online').reduce((acc, s) => acc + s.load, 0) / MOCK_ADMIN_SERVERS.filter(s => s.status === 'online').length),
  totalBandwidth: MOCK_ADMIN_SERVERS.reduce((acc, s) => acc + s.bandwidth, 0).toFixed(1),
  errorsLast24h: MOCK_LOGS.filter(l => l.level === 'error').length,
};

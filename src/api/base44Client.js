/**
 * MOCK Base44 client — runs the app with NO backend.
 *
 * Replaces the real @base44/sdk client so the UI works standalone.
 * All data lives in the browser's localStorage and starts empty —
 * records you create in the UI persist until localStorage is cleared.
 *
 * To restore the real Base44 backend:
 *   git checkout src/api/base44Client.js src/lib/app-params.js
 */

const STORE_KEY = 'seaview_mock_db';

const uid = () => Math.random().toString(36).slice(2, 10);
const ts = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

const MOCK_USER = {
  id: 'mock-user-1',
  full_name: 'Demo Admin',
  email: 'demo@seaview.local',
  role: 'admin',
  created_date: ts(-90),
};

function seed() {
  return {
    Guest: [],
    Booking: [],
    Invoice: [],
    Payment: [],
    FAQ: [],
    Message: [],
    ReservationRequest: [],
    ReviewRequest: [],
    AuditLog: [],
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  const fresh = seed();
  saveDb(fresh);
  return fresh;
}

function saveDb(db) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* quota / private mode */ }
}

function rowsOf(name) {
  const db = loadDb();
  return Array.isArray(db[name]) ? db[name] : [];
}

function writeRows(name, rows) {
  const db = loadDb();
  db[name] = rows;
  saveDb(db);
}

function applySort(rows, sort) {
  if (!sort || typeof sort !== 'string') return rows;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const x = a?.[key] ?? '';
    const y = b?.[key] ?? '';
    if (x === y) return 0;
    return (x > y ? 1 : -1) * (desc ? -1 : 1);
  });
}

function matches(row, query) {
  return Object.entries(query || {}).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) return true; // ignore operator queries
    return row?.[k] === v;
  });
}

function makeEntity(name) {
  return {
    async list(sort, limit) {
      const rows = applySort(rowsOf(name), sort);
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    },
    async filter(query, sort, limit) {
      const rows = applySort(rowsOf(name).filter((r) => matches(r, query)), sort);
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    },
    async get(id) {
      return rowsOf(name).find((r) => r.id === id) ?? null;
    },
    async create(data) {
      const row = { id: uid(), created_date: new Date().toISOString(), ...data };
      writeRows(name, [row, ...rowsOf(name)]);
      return row;
    },
    async update(id, data) {
      const rows = rowsOf(name);
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return null;
      rows[i] = { ...rows[i], ...data };
      writeRows(name, rows);
      return rows[i];
    },
    async delete(id) {
      writeRows(name, rowsOf(name).filter((r) => r.id !== id));
      return { success: true };
    },
    async bulkCreate(items = []) {
      const created = items.map((d) => ({ id: uid(), created_date: new Date().toISOString(), ...d }));
      writeRows(name, [...created, ...rowsOf(name)]);
      return created;
    },
  };
}

const entities = new Proxy({}, {
  get: (_target, prop) => (typeof prop === 'string' ? makeEntity(prop) : undefined),
});

const auth = {
  async me() { return MOCK_USER; },
  async isAuthenticated() { return true; },
  async loginViaEmailPassword() { return { user: MOCK_USER, token: 'mock-token' }; },
  async loginWithProvider() { return { user: MOCK_USER, token: 'mock-token' }; },
  async register() { return { user: MOCK_USER, token: 'mock-token' }; },
  async verifyOtp() { return { user: MOCK_USER, token: 'mock-token' }; },
  async resendOtp() { return { success: true }; },
  async resetPassword() { return { success: true }; },
  async resetPasswordRequest() { return { success: true }; },
  setToken() { /* no-op */ },
  logout() { window.location.assign('/'); },
  redirectToLogin() { window.location.assign('/'); },
};

const app = {
  async getPublicSettings() {
    return { id: 'mock-app', public_settings: { app_name: 'Seaview Guest Manager' } };
  },
};

export const base44 = { entities, auth, app, integrations: {}, functions: {} };

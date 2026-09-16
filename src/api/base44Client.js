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

import { supabase } from '@/lib/supabaseClient';

function makeEntity(name) {
  return {
    async list(sort, limit) {
      let q = supabase.from(name).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async filter(query, sort, limit) {
      let q = supabase.from(name).select('*');
      Object.entries(query || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      if (sort) {
        const desc = sort.startsWith('-');
        q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async get(id) {
      const { data, error } = await supabase.from(name).select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },
    async create(payload) {
      const { data, error } = await supabase.from(name).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async update(id, payload) {
      const { data, error } = await supabase.from(name).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(name).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    async bulkCreate(items = []) {
      const { data, error } = await supabase.from(name).insert(items).select();
      if (error) throw error;
      return data;
    },
  };
}

const entities = new Proxy({}, {
  get: (_t, prop) => (typeof prop === 'string' ? makeEntity(prop) : undefined),
});

const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async register(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  logout() { supabase.auth.signOut(); window.location.assign('/'); },
  redirectToLogin() { window.location.assign('/login'); },
};

const app = { async getPublicSettings() { return { public_settings: { app_name: 'Seaview Guest Manager' } }; } };

export const base44 = { entities, auth, app, integrations: {}, functions: {} };


// const STORE_KEY = 'seaview_mock_db';

// const uid = () => Math.random().toString(36).slice(2, 10);
// const ts = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

// const MOCK_USER = {
//   id: 'mock-user-1',
//   full_name: 'Demo Admin',
//   email: 'demo@seaview.local',
//   role: 'admin',
//   created_date: ts(-90),
// };

// function seed() {
//   return {
//     Guest: [],
//     Booking: [],
//     Invoice: [],
//     Payment: [],
//     FAQ: [],
//     Message: [],
//     ReservationRequest: [],
//     ReviewRequest: [],
//     AuditLog: [],
//   };
// }

// function loadDb() {
//   try {
//     const raw = localStorage.getItem(STORE_KEY);
//     if (raw) return JSON.parse(raw);
//   } catch { /* fall through to seed */ }
//   const fresh = seed();
//   saveDb(fresh);
//   return fresh;
// }

// function saveDb(db) {
//   try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* quota / private mode */ }
// }

// function rowsOf(name) {
//   const db = loadDb();
//   return Array.isArray(db[name]) ? db[name] : [];
// }

// function writeRows(name, rows) {
//   const db = loadDb();
//   db[name] = rows;
//   saveDb(db);
// }

// function applySort(rows, sort) {
//   if (!sort || typeof sort !== 'string') return rows;
//   const desc = sort.startsWith('-');
//   const key = desc ? sort.slice(1) : sort;
//   return [...rows].sort((a, b) => {
//     const x = a?.[key] ?? '';
//     const y = b?.[key] ?? '';
//     if (x === y) return 0;
//     return (x > y ? 1 : -1) * (desc ? -1 : 1);
//   });
// }

// function matches(row, query) {
//   return Object.entries(query || {}).every(([k, v]) => {
//     if (v && typeof v === 'object' && !Array.isArray(v)) return true; // ignore operator queries
//     return row?.[k] === v;
//   });
// }

// function makeEntity(name) {
//   return {
//     async list(sort, limit) {
//       const rows = applySort(rowsOf(name), sort);
//       return typeof limit === 'number' ? rows.slice(0, limit) : rows;
//     },
//     async filter(query, sort, limit) {
//       const rows = applySort(rowsOf(name).filter((r) => matches(r, query)), sort);
//       return typeof limit === 'number' ? rows.slice(0, limit) : rows;
//     },
//     async get(id) {
//       return rowsOf(name).find((r) => r.id === id) ?? null;
//     },
//     async create(data) {
//       const row = { id: uid(), created_date: new Date().toISOString(), ...data };
//       writeRows(name, [row, ...rowsOf(name)]);
//       return row;
//     },
//     async update(id, data) {
//       const rows = rowsOf(name);
//       const i = rows.findIndex((r) => r.id === id);
//       if (i === -1) return null;
//       rows[i] = { ...rows[i], ...data };
//       writeRows(name, rows);
//       return rows[i];
//     },
//     async delete(id) {
//       writeRows(name, rowsOf(name).filter((r) => r.id !== id));
//       return { success: true };
//     },
//     async bulkCreate(items = []) {
//       const created = items.map((d) => ({ id: uid(), created_date: new Date().toISOString(), ...d }));
//       writeRows(name, [...created, ...rowsOf(name)]);
//       return created;
//     },
//   };
// }

// const entities = new Proxy({}, {
//   get: (_target, prop) => (typeof prop === 'string' ? makeEntity(prop) : undefined),
// });

// const auth = {
//   async me() { return MOCK_USER; },
//   async isAuthenticated() { return true; },
//   async loginViaEmailPassword() { return { user: MOCK_USER, token: 'mock-token' }; },
//   async loginWithProvider() { return { user: MOCK_USER, token: 'mock-token' }; },
//   async register() { return { user: MOCK_USER, token: 'mock-token' }; },
//   async verifyOtp() { return { user: MOCK_USER, token: 'mock-token' }; },
//   async resendOtp() { return { success: true }; },
//   async resetPassword() { return { success: true }; },
//   async resetPasswordRequest() { return { success: true }; },
//   setToken() { /* no-op */ },
//   logout() { window.location.assign('/'); },
//   redirectToLogin() { window.location.assign('/'); },
// };

// const app = {
//   async getPublicSettings() {
//     return { id: 'mock-app', public_settings: { app_name: 'Seaview Guest Manager' } };
//   },
// };

// export const base44 = { entities, auth, app, integrations: {}, functions: {} };

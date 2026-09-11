/**
 * MOCK Base44 client — runs the app with NO backend.
 *
 * Replaces the real @base44/sdk client so the UI works standalone.
 * All data lives in the browser's localStorage and is seeded with demo
 * records on first load.
 *
 * To restore the real Base44 backend:
 *   git checkout src/api/base44Client.js src/lib/app-params.js
 */

const STORE_KEY = 'seaview_mock_db';

const uid = () => Math.random().toString(36).slice(2, 10);
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

const MOCK_USER = {
  id: 'mock-user-1',
  full_name: 'Demo Admin',
  email: 'demo@seaview.local',
  role: 'admin',
  created_date: ts(-90),
};

function seed() {
  const g1 = uid(), g2 = uid(), g3 = uid();
  const b1 = uid(), b2 = uid(), b3 = uid();

  return {
    Guest: [
      { id: g1, full_name: 'Maria Santos', email: 'maria@example.com', phone: '+63 917 555 0142', city: 'Cebu', country: 'Philippines', status: 'active', total_stays: 3, tags: ['returning'], created_date: ts(-70) },
      { id: g2, full_name: 'James Whitfield', email: 'james.w@example.com', phone: '+1 415 555 0177', city: 'San Francisco', country: 'USA', status: 'active', total_stays: 1, tags: [], created_date: ts(-35) },
      { id: g3, full_name: 'Aiko Tanaka', email: 'aiko.t@example.com', phone: '+81 90 5555 0199', city: 'Osaka', country: 'Japan', status: 'active', total_stays: 2, tags: ['vip'], created_date: ts(-12) },
    ],
    Booking: [
      { id: b1, sv_number: 'SV-1041', guest_id: g1, guest_name: 'Maria Santos', source: 'direct', check_in: day(-3), check_out: day(2), status: 'in_house', num_guests: 2, num_nights: 5, total_amount: 640, currency: 'USD', review_status: 'auto', created_date: ts(-20) },
      { id: b2, sv_number: 'SV-1042', guest_id: g2, guest_name: 'James Whitfield', source: 'airbnb', check_in: day(6), check_out: day(11), status: 'confirmed', num_guests: 4, num_nights: 5, total_amount: 890, currency: 'USD', review_status: 'auto', created_date: ts(-9) },
      { id: b3, sv_number: 'SV-1043', guest_id: g3, guest_name: 'Aiko Tanaka', source: 'vrbo', check_in: day(-30), check_out: day(-24), status: 'completed', num_guests: 2, num_nights: 6, total_amount: 1120, currency: 'USD', review_status: 'resolved', created_date: ts(-45) },
    ],
    Invoice: [
      { id: uid(), invoice_number: 'INV-2041', booking_id: b1, guest_id: g1, guest_name: 'Maria Santos', issue_date: day(-3), due_date: day(4), subtotal: 580, cleaning_fee: 40, tax: 20, total: 640, amount_paid: 320, balance: 320, status: 'sent', created_date: ts(-3) },
      { id: uid(), invoice_number: 'INV-2039', booking_id: b3, guest_id: g3, guest_name: 'Aiko Tanaka', issue_date: day(-30), due_date: day(-23), subtotal: 1040, cleaning_fee: 50, tax: 30, total: 1120, amount_paid: 1120, balance: 0, status: 'paid', created_date: ts(-30) },
    ],
    Payment: [
      { id: uid(), booking_id: b1, guest_id: g1, amount: 320, currency: 'USD', method: 'card', status: 'succeeded', paid_date: day(-3), created_date: ts(-3) },
      { id: uid(), booking_id: b3, guest_id: g3, amount: 1120, currency: 'USD', method: 'card', status: 'succeeded', paid_date: day(-30), created_date: ts(-30) },
    ],
    FAQ: [
      { id: uid(), question: 'What time is check-in?', answer: 'Check-in is from 2:00 PM. Early check-in may be arranged on request.', category: 'Stay', order: 1, created_date: ts(-60) },
      { id: uid(), question: 'Is parking available?', answer: 'Yes — one free off-street parking space per booking.', category: 'Amenities', order: 2, created_date: ts(-60) },
    ],
    Message: [
      { id: uid(), booking_id: b1, guest_id: g1, guest_name: 'Maria Santos', channel: 'email', direction: 'inbound', subject: 'Late arrival', body: 'Hi! Our flight lands at 9pm, is late check-in okay?', status: 'unread', created_date: ts(-2) },
    ],
    ReservationRequest: [
      { id: uid(), full_name: 'Elena Rossi', email: 'elena.r@example.com', check_in: day(20), check_out: day(26), num_guests: 3, message: 'Celebrating an anniversary — any sea-view room?', status: 'pending', created_date: ts(-1) },
    ],
    ReviewRequest: [
      { id: uid(), booking_id: b3, guest_id: g3, guest_name: 'Aiko Tanaka', status: 'sent', sent_date: day(-23), created_date: ts(-23) },
    ],
    AuditLog: [
      { id: uid(), action: 'booking.created', entity: 'Booking', entity_id: b2, actor: MOCK_USER.email, created_date: ts(-9) },
      { id: uid(), action: 'invoice.paid', entity: 'Invoice', entity_id: b3, actor: MOCK_USER.email, created_date: ts(-30) },
    ],
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

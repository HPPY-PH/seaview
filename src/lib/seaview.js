import { base44 } from "@/api/base44Client";

export function formatCurrency(amount, currency = "USD") {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export function formatDate(date, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(ms / 86400000));
}

export function daysUntil(date) {
  if (!date) return null;
  const ms = new Date(date) - new Date();
  return Math.ceil(ms / 86400000);
}

export function statusTone(status) {
  const map = {
    pending: "amber",
    confirmed: "blue",
    in_house: "emerald",
    completed: "slate",
    cancelled: "rose",
    archived: "gray",
    draft: "gray",
    sent: "blue",
    paid: "emerald",
    overdue: "rose",
    active: "emerald",
    inactive: "gray",
    blacklisted: "rose",
    approved: "emerald",
    rejected: "rose",
    converted: "emerald",
    needs_review: "amber",
    auto: "emerald",
    resolved: "blue",
  };
  return map[status] || "gray";
}

export function statusLabel(status) {
  return (status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sourceLabel(source) {
  const map = { airbnb: "Airbnb", vrbo: "VRBO", direct: "Direct" };
  return map[source] || source;
}

export async function nextSvNumber() {
  const bookings = await base44.entities.Booking.list("-created_date", 200);
  let max = 0;
  bookings.forEach((b) => {
    const m = /SV-(\d+)/i.exec(b.sv_number || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `SV-${String(max + 1).padStart(4, "0")}`;
}

export async function nextInvoiceNumber() {
  const invoices = await base44.entities.Invoice.list("-created_date", 200);
  let max = 0;
  invoices.forEach((i) => {
    const m = /INV-(\d+)/i.exec(i.invoice_number || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export async function logAudit({ action, entityType, entityId, result = "success", before, after }) {
  try {
    const me = await base44.auth.me().catch(() => null);
    await base44.entities.AuditLog.create({
      actor_id: me?.id || "system",
      actor_name: me?.full_name || me?.email || "System",
      actor_role: me?.role || "system",
      action,
      entity_type: entityType,
      entity_id: entityId,
      result,
      before: before ? JSON.stringify(before) : "",
      after: after ? JSON.stringify(after) : "",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    // audit logging should never break the operation
  }
}

export function toCSV(rows, columns) {
  const headers = columns.map((c) => `"${(c.label || c.key).replace(/"/g, '""')}"`).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => {
      let val = row[c.key];
      if (Array.isArray(val)) val = val.join("; ");
      if (val && typeof val === "object") val = JSON.stringify(val);
      return `"${String(val ?? "").replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers, ...lines].join("\n");
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
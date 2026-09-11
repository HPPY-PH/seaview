import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { nextInvoiceNumber, logAudit } from "@/lib/seaview";

export default function InvoiceFormDialog({ booking, guest, onClose, onSaved }) {
  const [form, setForm] = useState({
    invoice_number: "", booking_id: booking?.id || "", guest_id: booking?.guest_id || "",
    guest_user_id: booking?.guest_user_id || "", guest_name: booking?.guest_name || guest?.full_name || "",
    issue_date: new Date().toISOString().slice(0, 10), due_date: "", subtotal: 0, cleaning_fee: 0,
    tax: 0, total: 0, amount_paid: 0, balance: 0, status: "draft", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { nextInvoiceNumber().then((n) => set("invoice_number", n)); }, []);

  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    next.total = (Number(next.subtotal) || 0) + (Number(next.cleaning_fee) || 0) + (Number(next.tax) || 0);
    next.balance = next.total - (Number(next.amount_paid) || 0);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await base44.entities.Invoice.create(form);
      await logAudit({ action: "create_invoice", entityType: "Invoice", entityId: created.id, after: form });
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not save invoice: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">New Invoice</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice #"><input required value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} className="input" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue Date"><input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} className="input" /></Field>
            <Field label="Due Date"><input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="input" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Subtotal"><input type="number" step="0.01" value={form.subtotal} onChange={(e) => set("subtotal", +e.target.value)} className="input" /></Field>
            <Field label="Cleaning Fee"><input type="number" step="0.01" value={form.cleaning_fee} onChange={(e) => set("cleaning_fee", +e.target.value)} className="input" /></Field>
            <Field label="Tax"><input type="number" step="0.01" value={form.tax} onChange={(e) => set("tax", +e.target.value)} className="input" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount Paid"><input type="number" step="0.01" value={form.amount_paid} onChange={(e) => set("amount_paid", +e.target.value)} className="input" /></Field>
            <Field label="Total"><input readOnly value={form.total.toFixed(2)} className="input bg-secondary/50" /></Field>
            <Field label="Balance"><input readOnly value={form.balance.toFixed(2)} className="input bg-secondary/50" /></Field>
          </div>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Create Invoice"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
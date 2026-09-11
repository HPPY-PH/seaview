import React, { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/seaview";

export default function PaymentFormDialog({ booking, invoices, onClose, onSaved }) {
  const [form, setForm] = useState({
    invoice_id: invoices[0]?.id || "", booking_id: booking?.id || "", guest_id: booking?.guest_id || "",
    guest_name: booking?.guest_name || "", amount: 0, type: "full", method: "bank_transfer",
    payment_date: new Date().toISOString().slice(0, 10), reference: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await base44.entities.Payment.create(form);
      await logAudit({ action: "record_payment", entityType: "Payment", entityId: created.id, after: form });
      // update invoice amount_paid and balance
      if (form.invoice_id) {
        const inv = invoices.find((i) => i.id === form.invoice_id);
        if (inv) {
          const newPaid = (inv.amount_paid || 0) + Number(form.amount);
          const newBalance = (inv.total || 0) - newPaid;
          await base44.entities.Invoice.update(inv.id, { amount_paid: newPaid, balance: newBalance, status: newBalance <= 0 ? "paid" : inv.status });
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not record payment: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Record Payment</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {invoices.length > 0 && (
            <Field label="Invoice">
              <select value={form.invoice_id} onChange={(e) => set("invoice_id", e.target.value)} className="input">
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number} — {i.balance} due</option>)}
              </select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount *"><input required type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", +e.target.value)} className="input" /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="input">
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
                <option value="full">Full</option>
                <option value="refund">Refund</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method">
              <select value={form.method} onChange={(e) => set("method", e.target.value)} className="input">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} className="input" /></Field>
          </div>
          <Field label="Reference"><input value={form.reference} onChange={(e) => set("reference", e.target.value)} className="input" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Record"}</button>
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
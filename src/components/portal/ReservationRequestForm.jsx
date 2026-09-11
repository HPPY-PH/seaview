import React, { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { nightsBetween } from "@/lib/seaview";

export default function ReservationRequestForm({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    guest_name: user?.full_name || "", email: user?.email || "", guest_user_id: user?.id || "",
    check_in: "", check_out: "", num_guests: 1, notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.ReservationRequest.create({
        ...form, num_nights: nightsBetween(form.check_in, form.check_out), status: "pending",
      });
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not submit request: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Request a Reservation</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Submit your preferred dates and Seaview staff will confirm availability and pricing.</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Check In *</label>
              <input required type="date" value={form.check_in} onChange={(e) => set("check_in", e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Check Out *</label>
              <input required type="date" value={form.check_out} onChange={(e) => set("check_out", e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Number of Guests</label>
            <input type="number" min="1" value={form.num_guests} onChange={(e) => set("num_guests", +e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Special requests, occasions, questions…" className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Submitting…" : "Submit Request"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
  );
}
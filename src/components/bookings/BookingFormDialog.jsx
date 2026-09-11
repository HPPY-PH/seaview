import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { nextSvNumber, nightsBetween, logAudit } from "@/lib/seaview";

export default function BookingFormDialog({ booking, onClose, onSaved }) {
  const [guests, setGuests] = useState([]);
  const [form, setForm] = useState({
    sv_number: "", guest_id: "", guest_name: "", guest_user_id: "",
    source: "direct", check_in: "", check_out: "", status: "confirmed",
    num_guests: 1, total_amount: 0, currency: "USD", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Guest.list("-created_date", 500).then(setGuests);
    if (booking) setForm({ ...form, ...booking });
    else nextSvNumber().then((sv) => set("sv_number", sv));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onGuestChange = (gid) => {
    const g = guests.find((x) => x.id === gid);
    setForm((f) => ({ ...f, guest_id: gid, guest_name: g?.full_name || "", guest_user_id: g?.user_id || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nights = nightsBetween(form.check_in, form.check_out);
    const payload = { ...form, num_nights: nights };
    setSaving(true);
    try {
      if (booking?.id) {
        await base44.entities.Booking.update(booking.id, payload);
        await logAudit({ action: "update_booking", entityType: "Booking", entityId: booking.id, after: payload });
      } else {
        const created = await base44.entities.Booking.create(payload);
        await logAudit({ action: "create_booking", entityType: "Booking", entityId: created.id, after: payload });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not save booking: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{booking ? "Edit Booking" : "New Booking"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SV Number *"><input required value={form.sv_number} onChange={(e) => set("sv_number", e.target.value)} className="input" /></Field>
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input">
                <option value="airbnb">Airbnb</option>
                <option value="vrbo">VRBO</option>
                <option value="direct">Direct</option>
              </select>
            </Field>
          </div>
          <Field label="Guest *">
            <select required value={form.guest_id} onChange={(e) => onGuestChange(e.target.value)} className="input">
              <option value="">Select guest…</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name} — {g.email}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Check In *"><input required type="date" value={form.check_in} onChange={(e) => set("check_in", e.target.value)} className="input" /></Field>
            <Field label="Check Out *"><input required type="date" value={form.check_out} onChange={(e) => set("check_out", e.target.value)} className="input" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Guests"><input type="number" min="1" value={form.num_guests} onChange={(e) => set("num_guests", +e.target.value)} className="input" /></Field>
            <Field label="Total Amount"><input type="number" step="0.01" value={form.total_amount} onChange={(e) => set("total_amount", +e.target.value)} className="input" /></Field>
            <Field label="Currency"><input value={form.currency} onChange={(e) => set("currency", e.target.value)} className="input" /></Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_house">In House</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Save Booking"}</button>
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
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/seaview";

// changed address to address_line 09-16-2026 Paolo
// commented invite_status because it has no use right now. 09-16-2026 Paolo
export default function GuestFormDialog({ guest, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", address_line: "", city: "", country: "",
    status: "active", notes: "", tags: [], //invite_status: "not_invited",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guest) setForm({ ...form, ...guest });
  }, [guest]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (guest?.id) {
        await base44.entities.Guest.update(guest.id, form);
        await logAudit({ action: "update_guest", entityType: "Guest", entityId: guest.id, after: form });
      } else {
        const created = await base44.entities.Guest.create(form);
        await logAudit({ action: "create_guest", entityType: "Guest", entityId: created.id, after: form });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not save guest: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{guest ? "Edit Guest" : "New Guest Profile"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *"><input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="input" /></Field>
            <Field label="Email *"><input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" /></Field>
            <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} className="input" /></Field>
          </div>
          <Field label="Address"><input value={form.address_line} onChange={(e) => set("address_line", e.target.value)} className="input" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><input value={form.city} onChange={(e) => set("city", e.target.value)} className="input" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </Field>
          </div>
          <Field label="Tags">
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add a tag…" className="input" />
              <button type="button" onClick={addTag} className="rounded-lg border border-border px-3 text-sm">Add</button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                    {t}
                    <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="Notes"><textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Save Guest"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
    ),
    document.body,
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
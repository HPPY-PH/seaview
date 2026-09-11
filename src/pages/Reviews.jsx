import React, { useEffect, useState } from "react";
import { Star, Plus, Send, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate, logAudit } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Reviews() {
  const [requests, setRequests] = useState(null);
  const [guests, setGuests] = useState([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [r, g] = await Promise.all([
      base44.entities.ReviewRequest.list("-created_date", 500),
      base44.entities.Guest.list("-created_date", 500),
    ]);
    setRequests(r);
    setGuests(g);
  }
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.ReviewRequest.update(id, { status });
    await logAudit({ action: "update_review_request", entityType: "ReviewRequest", entityId: id, after: { status } });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Review Requests" subtitle="Track and send post-stay review requests across Airbnb, VRBO and Google." icon={Star}>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </PageHeader>

      {!requests?.length ? (
        <EmptyState icon={Star} title="No review requests" description="Send a review request after a guest completes their stay." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{r.guest_name || "—"}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{r.platform}</span>
                  {r.sv_number && <span className="text-xs text-muted-foreground">{r.sv_number}</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Requested {formatDate(r.requested_at)}</p>
                {r.response_notes && <p className="mt-1 text-sm text-muted-foreground">{r.response_notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === "pending" && <button onClick={() => updateStatus(r.id, "sent")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"><Send className="mr-1 inline h-3 w-3" />Send</button>}
                {r.status === "sent" && <button onClick={() => updateStatus(r.id, "completed")} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Check className="mr-1 inline h-3 w-3" />Complete</button>}
                <button onClick={() => updateStatus(r.id, "declined")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"><X className="inline h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ReviewFormDialog guests={guests} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function ReviewFormDialog({ guests, onClose, onSaved }) {
  const [form, setForm] = useState({ guest_id: "", guest_name: "", platform: "airbnb", status: "pending", response_notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const g = guests.find((x) => x.id === form.guest_id);
    setSaving(true);
    try {
      await base44.entities.ReviewRequest.create({ ...form, guest_name: g?.full_name || form.guest_name, requested_at: new Date().toISOString() });
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not create request: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold">New Review Request</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Guest</label>
            <select required value={form.guest_id} onChange={(e) => set("guest_id", e.target.value)} className="input">
              <option value="">Select guest…</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Platform</label>
            <select value={form.platform} onChange={(e) => set("platform", e.target.value)} className="input">
              <option value="airbnb">Airbnb</option>
              <option value="vrbo">VRBO</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Notes</label>
            <textarea rows={2} value={form.response_notes} onChange={(e) => set("response_notes", e.target.value)} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { HelpCircle, Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function FAQs() {
  const [faqs, setFaqs] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() { setFaqs(await base44.entities.FAQ.list("order", 500)); }
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm("Delete this FAQ?")) return;
    await base44.entities.FAQ.delete(id);
    await logAudit({ action: "delete_faq", entityType: "FAQ", entityId: id });
    load();
  };

  const togglePublished = async (f) => {
    await base44.entities.FAQ.update(f.id, { published: !f.published });
    load();
  };

  const move = async (f, dir) => {
    const sorted = [...(faqs || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex((x) => x.id === f.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await base44.entities.FAQ.update(f.id, { order: swap.order });
    await base44.entities.FAQ.update(swap.id, { order: f.order });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="FAQs" subtitle="Frequently asked questions shown to guests in the portal. Reorder, publish and edit here." icon={HelpCircle}>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New FAQ
        </button>
      </PageHeader>

      {!faqs?.length ? (
        <EmptyState icon={HelpCircle} title="No FAQs yet" description="Add questions that returning guests often ask about the property." />
      ) : (
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{f.category}</span>
                    {!f.published && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Hidden</span>}
                  </div>
                  <p className="mt-2 font-medium text-foreground">{f.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(f, -1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => move(f, 1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"><ChevronDown className="h-4 w-4" /></button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => togglePublished(f)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary" title={f.published ? "Hide" : "Publish"}>{f.published ? "👁" : "🚫"}</button>
                  <button onClick={() => { setEditing(f); setShowForm(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(f.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <FAQFormDialog faq={editing} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function FAQFormDialog({ faq, onClose, onSaved }) {
  const [form, setForm] = useState({ question: "", answer: "", category: "General", order: 0, published: true });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (faq) setForm({ ...faq }); }, [faq]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (faq?.id) await base44.entities.FAQ.update(faq.id, form);
      else await base44.entities.FAQ.create(form);
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Could not save: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold">{faq ? "Edit FAQ" : "New FAQ"}</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Question *</label>
            <input required value={form.question} onChange={(e) => set("question", e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Answer *</label>
            <textarea required rows={4} value={form.answer} onChange={(e) => set("answer", e.target.value)} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Category</label>
              <input value={form.category} onChange={(e) => set("category", e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Order</label>
              <input type="number" value={form.order} onChange={(e) => set("order", +e.target.value)} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Published
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
  );
}
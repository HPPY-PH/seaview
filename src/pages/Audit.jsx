import React, { useEffect, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDateTime } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Audit() {
  const [logs, setLogs] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => { base44.entities.AuditLog.list("-created_date", 500).then(setLogs); }, []);

  const filtered = (logs || []).filter((l) => {
    const q = query.toLowerCase();
    return !query || (l.action || "").toLowerCase().includes(q) || (l.actor_name || "").toLowerCase().includes(q) || (l.entity_type || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="A record of material booking, financial, access and integration review changes — actor, action, result and before/after values." icon={ScrollText} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by action, actor or entity…" className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {!filtered.length ? (
        <EmptyState icon={ScrollText} title="No audit entries" description="Material changes will be recorded here automatically." />
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className={`mt-0.5 h-2 w-2 rounded-full ${l.result === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{l.action.replace(/_/g, " ")}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{l.entity_type}</span>
                  {l.entity_id && <span className="text-xs text-muted-foreground">#{l.entity_id.slice(-6)}</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{l.actor_name} · {l.actor_role} · {formatDateTime(l.created_date)}</p>
                {(l.before || l.after) && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">View changes</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {l.before && <pre className="overflow-x-auto rounded-lg bg-rose-50 p-2 text-xs text-rose-900">{l.before}</pre>}
                      {l.after && <pre className="overflow-x-auto rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{l.after}</pre>}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
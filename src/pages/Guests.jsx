import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, UserPlus, Mail, Phone, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import GuestFormDialog from "@/components/guests/GuestFormDialog";

export default function Guests() {
  const [guests, setGuests] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const data = await base44.entities.Guest.list("-created_date", 500);
    setGuests(data);
  }

  useEffect(() => { load(); }, []);

  const filtered = (guests || []).filter((g) => {
    const matchesQuery = !query || (g.full_name || "").toLowerCase().includes(query.toLowerCase()) || (g.email || "").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Guest CRM" subtitle="A single guest profile connected to multiple stays. Invitation-only portal access for approved returning guests." icon={Users}>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus className="h-4 w-4" /> New Guest
        </button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={Users} title="No guests found" description="Add your first guest profile to start tracking stays and portal access." action={<button onClick={() => setShowForm(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">New Guest</button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Guest</th>
                <th className="hidden px-5 py-3 md:table-cell">Contact</th>
                <th className="hidden px-5 py-3 lg:table-cell">Stays</th>
                <th className="px-5 py-3">Portal</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <Link to={`/guests/${g.id}`} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-medium text-foreground">
                        {(g.full_name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground hover:text-primary">{g.full_name}</p>
                        <p className="text-xs text-muted-foreground">{g.city ? `${g.city}, ${g.country || ""}` : g.country || "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    <p className="text-xs text-muted-foreground">{g.email}</p>
                    <p className="text-xs text-muted-foreground">{g.phone || "—"}</p>
                  </td>
                  <td className="hidden px-5 py-3 lg:table-cell text-foreground">{g.total_stays || 0}</td>
                  <td className="px-5 py-3"><StatusBadge status={g.invite_status} /></td>
                  <td className="px-5 py-3"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <GuestFormDialog onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}
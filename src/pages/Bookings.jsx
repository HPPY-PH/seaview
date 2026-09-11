import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Search, Plus, Filter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate, sourceLabel, daysUntil } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import BookingFormDialog from "@/components/bookings/BookingFormDialog";

export default function Bookings() {
  const [bookings, setBookings] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setBookings(await base44.entities.Booking.list("-check_in", 500));
  }
  useEffect(() => { load(); }, []);

  const filtered = (bookings || []).filter((b) => {
    const q = query.toLowerCase();
    const matchesQuery = !query || (b.sv_number || "").toLowerCase().includes(q) || (b.guest_name || "").toLowerCase().includes(q);
    return matchesQuery && (statusFilter === "all" || b.status === statusFilter) && (sourceFilter === "all" || b.source === sourceFilter);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" subtitle="Every stay across Airbnb, VRBO and direct channels — each with a single SV reference number." icon={CalendarDays}>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Booking
        </button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by SV number or guest…" className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
          <option value="all">All sources</option>
          <option value="airbnb">Airbnb</option>
          <option value="vrbo">VRBO</option>
          <option value="direct">Direct</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_house">In House</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={CalendarDays} title="No bookings found" description="Create a booking to assign the next SV number and track a stay." action={<button onClick={() => setShowForm(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">New Booking</button>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">SV Number</th>
                <th className="px-5 py-3">Guest</th>
                <th className="hidden px-5 py-3 md:table-cell">Check In</th>
                <th className="hidden px-5 py-3 md:table-cell">Check Out</th>
                <th className="hidden px-5 py-3 lg:table-cell">Source</th>
                <th className="hidden px-5 py-3 lg:table-cell">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-3"><Link to={`/bookings/${b.id}`} className="font-medium text-primary hover:underline">{b.sv_number}</Link></td>
                  <td className="px-5 py-3">{b.guest_name || "—"}</td>
                  <td className="hidden px-5 py-3 md:table-cell text-muted-foreground">{formatDate(b.check_in)}</td>
                  <td className="hidden px-5 py-3 md:table-cell text-muted-foreground">{formatDate(b.check_out)}</td>
                  <td className="hidden px-5 py-3 lg:table-cell"><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{sourceLabel(b.source)}</span></td>
                  <td className="hidden px-5 py-3 lg:table-cell">{formatCurrency(b.total_amount, b.currency)}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <BookingFormDialog onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}
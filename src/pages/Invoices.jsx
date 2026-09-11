import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Invoices() {
  const [invoices, setInvoices] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { base44.entities.Invoice.list("-created_date", 500).then(setInvoices); }, []);

  const filtered = (invoices || []).filter((i) => {
    const q = query.toLowerCase();
    const matchesQuery = !query || (i.invoice_number || "").toLowerCase().includes(q) || (i.guest_name || "").toLowerCase().includes(q);
    return matchesQuery && (statusFilter === "all" || i.status === statusFilter);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Direct pricing, deposits, balances and payment dates for every booking." icon={Receipt} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice number or guest…" className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={Receipt} title="No invoices found" description="Invoices are created from individual booking pages." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Guest</th>
                <th className="hidden px-5 py-3 md:table-cell">Issued</th>
                <th className="hidden px-5 py-3 md:table-cell">Due</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-3"><Link to={`/bookings/${i.booking_id}`} className="font-medium text-primary hover:underline">{i.invoice_number}</Link></td>
                  <td className="px-5 py-3">{i.guest_name || "—"}</td>
                  <td className="hidden px-5 py-3 md:table-cell text-muted-foreground">{formatDate(i.issue_date)}</td>
                  <td className="hidden px-5 py-3 md:table-cell text-muted-foreground">{formatDate(i.due_date)}</td>
                  <td className="px-5 py-3">{formatCurrency(i.total)}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(i.balance)}</td>
                  <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
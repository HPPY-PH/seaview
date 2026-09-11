import React, { useEffect, useState } from "react";
import { CreditCard, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Payments() {
  const [payments, setPayments] = useState(null);

  useEffect(() => { base44.entities.Payment.list("-payment_date", 500).then(setPayments); }, []);

  const total = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="All deposits, balances and refunds recorded against bookings." icon={CreditCard} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Received</p>
          <p className="mt-2 font-display text-3xl font-semibold text-emerald-600">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Payments Logged</p>
          <p className="mt-2 font-display text-3xl font-semibold">{(payments || []).length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Deposits</p>
          <p className="mt-2 font-display text-3xl font-semibold">{formatCurrency((payments || []).filter((p) => p.type === "deposit").reduce((s, p) => s + p.amount, 0))}</p>
        </div>
      </div>

      {!payments?.length ? (
        <EmptyState icon={CreditCard} title="No payments recorded" description="Record payments from individual booking pages." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Guest</th>
                <th className="hidden px-5 py-3 md:table-cell">Type</th>
                <th className="hidden px-5 py-3 md:table-cell">Method</th>
                <th className="px-5 py-3">Amount</th>
                <th className="hidden px-5 py-3 lg:table-cell">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3 font-medium">{p.guest_name || "—"}</td>
                  <td className="hidden px-5 py-3 md:table-cell capitalize">{p.type}</td>
                  <td className="hidden px-5 py-3 md:table-cell capitalize">{(p.method || "").replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="hidden px-5 py-3 lg:table-cell text-muted-foreground">{p.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, Receipt, Clock, TrendingUp, AlertTriangle, ArrowRight, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate, daysUntil, sourceLabel } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";

function StatCard({ icon: Icon, label, value, sub, accent }) {
  // Test
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [bookings, guests, invoices, payments, requests] = await Promise.all([
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.Guest.list("-created_date", 500),
        base44.entities.Invoice.list("-created_date", 500),
        base44.entities.Payment.list("-created_date", 500),
        base44.entities.ReservationRequest.list("-created_date", 50),
      ]);
      setData({ bookings, guests, invoices, payments, requests });
    })();
  }, []);

  if (!data) return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;

  const { bookings, guests, invoices, payments, requests } = data;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const upcoming = bookings
    .filter((b) => b.check_in >= todayStr && b.status !== "cancelled" && b.status !== "archived")
    .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))
    .slice(0, 5);

  const inHouse = bookings.filter((b) => b.status === "in_house");
  const needsReview = bookings.filter((b) => b.review_status === "needs_review");
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_date && i.due_date < todayStr && i.balance > 0));

  const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.balance || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operations Dashboard"
        subtitle="A consolidated view of every stay — Airbnb, VRBO and direct — across the Seaview property."
        icon={Waves}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming Stays" value={upcoming.length} sub={`${inHouse.length} currently in house`} accent="bg-sky-50 text-sky-700" />
        <StatCard icon={Users} label="Guest Profiles" value={guests.length} sub={`${guests.filter((g) => g.invite_status === "accepted").length} with portal access`} accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={TrendingUp} label="Payments Received" value={formatCurrency(revenue)} sub="all time" accent="bg-amber-50 text-amber-700" />
        <StatCard icon={Receipt} label="Outstanding Balances" value={formatCurrency(outstanding)} sub={`${overdueInvoices.length} invoices overdue`} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Upcoming Arrivals</h2>
            <Link to="/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All bookings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {upcoming.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No upcoming stays scheduled.</p>}
            {upcoming.map((b) => {
              const d = daysUntil(b.check_in);
              return (
                <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between py-3 hover:bg-secondary/40 -mx-2 px-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-secondary">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">{formatDate(b.check_in, { month: "short" })}</span>
                      <span className="font-display text-base font-semibold leading-none">{formatDate(b.check_in, { day: "numeric" })}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{b.guest_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{b.sv_number} · {sourceLabel(b.source)} · {b.num_nights || 1} nights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{d === 0 ? "Today" : d > 0 ? `in ${d}d` : `${Math.abs(d)}d ago`}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600" /> Needs Attention
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <Link to="/bookings" className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 hover:bg-amber-100">
                <span className="text-amber-800">Bookings needing review</span>
                <span className="font-semibold text-amber-900">{needsReview.length}</span>
              </Link>
              <Link to="/reviews" className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2.5 hover:bg-sky-100">
                <span className="text-sky-800">Pending reservation requests</span>
                <span className="font-semibold text-sky-900">{pendingRequests.length}</span>
              </Link>
              <Link to="/invoices" className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2.5 hover:bg-rose-100">
                <span className="text-rose-800">Overdue invoices</span>
                <span className="font-semibold text-rose-900">{overdueInvoices.length}</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-[hsl(199_45%_30%)] p-6 text-primary-foreground shadow-sm">
            <Waves className="h-8 w-8 opacity-80" />
            <p className="mt-3 font-display text-lg font-medium">One property. One source of truth.</p>
            <p className="mt-1 text-sm text-primary-foreground/80">Every booking carries a single SV number as the master operational reference.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
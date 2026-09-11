import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Receipt, CreditCard, MessageSquare, Plus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate, sourceLabel, nightsBetween, logAudit } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import BookingFormDialog from "@/components/bookings/BookingFormDialog";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";

const statusFlow = ["pending", "confirmed", "in_house", "completed"];

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [guest, setGuest] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(null);

  async function load() {
    const b = await base44.entities.Booking.get(id);
    setBooking(b);
    if (b.guest_id) setGuest(await base44.entities.Guest.get(b.guest_id).catch(() => null));
    const [allInv, allPay, allMsg] = await Promise.all([
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.Payment.list("-payment_date", 500),
      base44.entities.Message.list("-created_date", 500),
    ]);
    setInvoices(allInv.filter((i) => i.booking_id === id));
    setPayments(allPay.filter((p) => p.booking_id === id));
    setMessages(allMsg.filter((m) => m.booking_id === id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  if (!booking) return <EmptyState title="Booking not found" />;

  const changeStatus = async (newStatus) => {
    const before = { status: booking.status };
    await base44.entities.Booking.update(id, { status: newStatus });
    await logAudit({ action: "booking_status_change", entityType: "Booking", entityId: id, before, after: { status: newStatus } });
    load();
  };

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{booking.sv_number}</h1>
            <StatusBadge status={booking.status} />
            {booking.review_status === "needs_review" && <StatusBadge status="needs_review" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {sourceLabel(booking.source)} · {booking.num_nights || nightsBetween(booking.check_in, booking.check_out)} nights · {booking.num_guests} guests
          </p>
        </div>
        <button onClick={() => setShowEdit(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Edit Booking</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Stay Details</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Check In</span><span className="font-medium">{formatDate(booking.check_in, { weekday: "short" })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check Out</span><span className="font-medium">{formatDate(booking.check_out, { weekday: "short" })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{formatCurrency(booking.total_amount, booking.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium text-emerald-600">{formatCurrency(totalPaid, booking.currency)}</span></div>
            </div>
            {guest && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Guest</p>
                <Link to={`/guests/${guest.id}`} className="mt-1 block font-medium text-primary hover:underline">{guest.full_name}</Link>
                <p className="text-xs text-muted-foreground">{guest.email}</p>
                <p className="text-xs text-muted-foreground">{guest.phone || ""}</p>
              </div>
            )}
            {booking.notes && (
              <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Status Workflow</h2>
            <div className="mt-3 space-y-2">
              {statusFlow.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    booking.status === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className="capitalize">{s.replace(/_/g, " ")}</span>
                  {booking.status === s && <CheckCircle2 className="h-4 w-4" />}
                </button>
              ))}
              <button onClick={() => changeStatus("cancelled")} className="flex w-full items-center justify-between rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                <span>Cancel</span>
                <XCircle className="h-4 w-4" />
              </button>
              <button onClick={() => changeStatus("archived")} className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Receipt className="h-5 w-5 text-muted-foreground" /> Invoices</h2>
              <button onClick={() => setShowInvoice(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <Plus className="h-4 w-4" /> Add Invoice
              </button>
            </div>
            <div className="mt-3 divide-y divide-border">
              {invoices.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>}
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">Issued {formatDate(inv.issue_date)} · Balance {formatCurrency(inv.balance)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><CreditCard className="h-5 w-5 text-muted-foreground" /> Payments</h2>
              <button onClick={() => setShowPayment({})} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <Plus className="h-4 w-4" /> Record Payment
              </button>
            </div>
            <div className="mt-3 divide-y divide-border">
              {payments.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded.</p>}
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{p.type} · {p.method} · {formatDate(p.payment_date)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.reference || ""}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><MessageSquare className="h-5 w-5 text-muted-foreground" /> Messages</h2>
            <div className="mt-3 divide-y divide-border">
              {messages.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No messages for this booking.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`py-3 ${m.direction === "outbound" ? "pl-4 border-l-2 border-primary" : "pl-4 border-l-2 border-muted"}`}>
                  <p className="text-xs text-muted-foreground">{m.direction} · {m.channel} · {formatDate(m.sent_at)}</p>
                  <p className="mt-1 text-sm">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showEdit && <BookingFormDialog booking={booking} onClose={() => setShowEdit(false)} onSaved={load} />}
      {showInvoice && <InvoiceFormDialog booking={booking} guest={guest} onClose={() => setShowInvoice(false)} onSaved={load} />}
      {showPayment && <PaymentFormDialog booking={booking} invoices={invoices} onClose={() => setShowPayment(null)} onSaved={load} />}
    </div>
  );
}
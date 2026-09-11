import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, CalendarDays, Receipt, MessageSquare, UserPlus, Send, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate, sourceLabel, logAudit } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function GuestDetail() {
  const { id } = useParams();
  const [guest, setGuest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [g, allBookings, allInvoices, allMessages] = await Promise.all([
      base44.entities.Guest.get(id),
      base44.entities.Booking.list("-check_in", 500),
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.Message.list("-created_date", 500),
    ]);
    setGuest(g);
    setBookings(allBookings.filter((b) => b.guest_id === id));
    setInvoices(allInvoices.filter((i) => i.guest_id === id));
    setMessages(allMessages.filter((m) => m.guest_id === id).slice(0, 10));
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  if (!guest) return <EmptyState title="Guest not found" />;

  const handleInvite = async () => {
    try {
      await base44.users.inviteUser(guest.email, "user");
      await base44.entities.Guest.update(id, { invited: true, invite_status: "pending", user_id: guest.user_id });
      await logAudit({ action: "invite_guest", entityType: "Guest", entityId: id, after: { email: guest.email } });
      load();
    } catch (e) {
      alert("Could not send invitation: " + (e.message || "unknown error"));
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke portal access for this guest?")) return;
    await base44.entities.Guest.update(id, { invite_status: "revoked", invited: false });
    await logAudit({ action: "revoke_guest_access", entityType: "Guest", entityId: id });
    load();
  };

  return (
    <div className="space-y-6">
      <Link to="/guests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to guests
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary font-display text-2xl font-semibold text-foreground">
            {(guest.full_name || "?").charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold">{guest.full_name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={guest.status} />
              <StatusBadge status={guest.invite_status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {guest.invite_status !== "accepted" && (
            <button onClick={handleInvite} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-4 w-4" /> Invite to Portal
            </button>
          )}
          {guest.invited && (
            <button onClick={handleRevoke} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
              <Ban className="h-4 w-4" /> Revoke
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-3 divide-y divide-border">
            <InfoRow icon={Mail} label="Email" value={guest.email} />
            <InfoRow icon={Phone} label="Phone" value={guest.phone} />
            <InfoRow icon={MapPin} label="Address" value={[guest.address, guest.city, guest.country].filter(Boolean).join(", ")} />
            <InfoRow icon={CalendarDays} label="Total Stays" value={guest.total_stays || bookings.length} />
            {guest.tags && guest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3">
                {guest.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{t}</span>)}
              </div>
            )}
          </div>
          {guest.notes && (
            <div className="mt-4 rounded-lg bg-secondary/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{guest.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Stay History</h2>
            <div className="mt-3 divide-y divide-border">
              {bookings.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No stays recorded.</p>}
              {bookings.map((b) => (
                <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between py-3 hover:bg-secondary/30 -mx-2 px-2 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{b.sv_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(b.check_in)} → {formatDate(b.check_out)} · {sourceLabel(b.source)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(b.total_amount, b.currency)}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Invoices</h2>
            <div className="mt-3 divide-y divide-border">
              {invoices.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No invoices.</p>}
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">Issued {formatDate(inv.issue_date)} · Balance {formatCurrency(inv.balance)}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Waves, CalendarDays, Receipt, MessageSquare, HelpCircle, Plus, ArrowRight, Send, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate, sourceLabel, nightsBetween } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ReservationRequestForm from "@/components/portal/ReservationRequestForm";
import { useAuth } from "@/lib/AuthContext";

export default function Portal() {
  const { appRole, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const user = await base44.auth.me();
      const role = appRole || user?.appRole || user?.app_metadata?.role || user?.user_metadata?.role;
      if (!['admin', 'staff'].includes(role)) {
        const linkedGuest = await base44.auth.getLinkedGuest(user.id);
        if (!linkedGuest || !['pending', 'accepted'].includes(linkedGuest.invite_status)) {
          setLoadError('Access is invitation-only. Please contact staff for access.');
          await logout(false);
          return;
        }
      }

      setMe(user);
      const loadOptional = (request) => request.catch((error) => {
        console.error("Portal data request failed:", error);
        return [];
      });
      const [b, inv, msg, faq] = await Promise.all([
        loadOptional(base44.entities.Booking.list("-check_in", 500)),
        loadOptional(base44.entities.Invoice.list("-created_date", 500)),
        loadOptional(base44.entities.Message.list("-created_date", 200)),
        loadOptional(base44.entities.FAQ.list("order", 100)),
      ]);
      setBookings(b.filter((x) => x.guest_user_id === user.id));
      setInvoices(inv.filter((x) => x.guest_user_id === user.id));
      setMessages(msg.filter((x) => x.guest_user_id === user.id || x.created_by_id === user.id));
      setFaqs(faq.filter((f) => f.published));
    } catch (error) {
      console.error("Portal failed to load:", error);
      setLoadError(error.message || "The portal could not load your account.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sendMessage = async () => {
    if (!messageBody.trim() || !me) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        guest_user_id: me.id, direction: "inbound", channel: "portal",
        body: messageBody, sent_at: new Date().toISOString(), status: "sent",
        guest_name: me.full_name || me.email,
      });
      setMessageBody("");
      load();
    } catch (e) {
      alert("Could not send message: " + (e.message || "unknown error"));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;

  const upcoming = bookings.filter((b) => new Date(b.check_out) >= new Date() && b.status !== "cancelled").sort((a, b) => new Date(a.check_in) - new Date(b.check_in));
  const past = bookings.filter((b) => new Date(b.check_out) < new Date() || b.status === "completed" || b.status === "cancelled").sort((a, b) => new Date(b.check_in) - new Date(a.check_in));

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><Waves className="h-5 w-5 text-primary-foreground" /></div>
            <div>
              <p className="font-display text-lg font-semibold leading-none">Seaview</p>
              <p className="text-xs text-muted-foreground">Guest Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{me?.full_name || me?.email}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">{(me?.full_name || me?.email || "G").charAt(0).toUpperCase()}</div>
            <button
              type="button"
              onClick={() => base44.auth.logout(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {loadError && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-[hsl(199_45%_30%)] p-8 text-primary-foreground shadow-sm">
          <Waves className="h-8 w-8 opacity-80" />
          <h1 className="mt-3 font-display text-3xl font-semibold">Welcome back{me?.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-primary-foreground/80">Your private channel for viewing stays and requesting future reservations at Seaview.</p>
          <button onClick={() => setShowRequest(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-5 py-2.5 text-sm font-medium text-sidebar-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Request a Reservation
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><CalendarDays className="h-5 w-5 text-muted-foreground" /> Your Stays</h2>
              <div className="mt-4 divide-y divide-border">
                {bookings.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No stays linked to your account yet.</p>}
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">{b.sv_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.num_nights || nightsBetween(b.check_in, b.check_out)} nights · {sourceLabel(b.source)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
                {past.length > 0 && (
                  <div className="pt-3">
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Past Stays</p>
                    {past.map((b) => (
                      <div key={b.id} className="flex items-center justify-between py-2 opacity-70">
                        <div>
                          <p className="text-sm font-medium">{b.sv_number}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(b.check_in)} → {formatDate(b.check_out)}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {invoices.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Receipt className="h-5 w-5 text-muted-foreground" /> Invoices</h2>
                <div className="mt-4 divide-y divide-border">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-foreground">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Due {formatDate(inv.due_date)} · Balance {formatCurrency(inv.balance)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><MessageSquare className="h-5 w-5 text-muted-foreground" /> Messages</h2>
              <div className="mt-4 space-y-3">
                {messages.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No messages yet. Send a note to Seaview staff below.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.direction === "outbound" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    <p>{m.body}</p>
                    <p className="mt-1 text-xs opacity-60">{formatDate(m.sent_at)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Write a message to Seaview staff…" className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={sendMessage} disabled={sending || !messageBody.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><HelpCircle className="h-4.5 w-4.5 text-muted-foreground" /> FAQs</h2>
              <div className="mt-3 space-y-3">
                {faqs.length === 0 && <p className="text-sm text-muted-foreground">No FAQs available.</p>}
                {faqs.map((f) => (
                  <details key={f.id} className="group">
                    <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary">{f.question}</summary>
                    <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showRequest && <ReservationRequestForm user={me} onClose={() => setShowRequest(false)} onSaved={load} />}
    </div>
  );
}
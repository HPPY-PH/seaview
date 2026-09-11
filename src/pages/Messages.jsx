import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Send, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDateTime } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Messages() {
  const [messages, setMessages] = useState(null);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  useEffect(() => { base44.entities.Message.list("-created_date", 500).then(setMessages); }, []);

  const filtered = (messages || []).filter((m) => {
    const q = query.toLowerCase();
    const matchesQuery = !query || (m.guest_name || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q) || (m.subject || "").toLowerCase().includes(q);
    return matchesQuery && (channelFilter === "all" || m.channel === channelFilter);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="A consolidated log of guest communication across email, WhatsApp, SMS and portal." icon={MessageSquare} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages…" className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
          <option value="all">All channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="portal">Portal</option>
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={MessageSquare} title="No messages" description="Messages from bookings and the guest portal appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className={`rounded-xl border border-border bg-card p-4 shadow-sm ${m.direction === "outbound" ? "border-l-4 border-l-primary" : "border-l-4 border-l-muted"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {m.guest_id && <Link to={`/guests/${m.guest_id}`} className="font-medium text-foreground hover:text-primary">{m.guest_name || "—"}</Link>}
                  {!m.guest_id && <span className="font-medium">{m.guest_name || "—"}</span>}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{m.channel}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(m.sent_at)}</span>
              </div>
              {m.subject && <p className="mt-2 text-sm font-medium">{m.subject}</p>}
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
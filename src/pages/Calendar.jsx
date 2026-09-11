import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate, sourceLabel } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";

const sourceColors = {
  airbnb: "bg-rose-100 text-rose-800 border-rose-200",
  vrbo: "bg-sky-100 text-sky-800 border-sky-200",
  direct: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function Calendar() {
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { base44.entities.Booking.list("-check_in", 500).then(setBookings); }, []);

  const { year, month, weeks, monthLabel } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startDay = first.getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { year: cursor.getFullYear(), month: cursor.getMonth(), weeks, monthLabel: first.toLocaleString("en-US", { month: "long", year: "numeric" }) };
  }, [cursor]);

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (b.status === "cancelled" || b.status === "archived") return;
      const start = new Date(b.check_in);
      const end = new Date(b.check_out);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        (map[key] = map[key] || []).push(b);
      }
    });
    return map;
  }, [bookings]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar & Availability" subtitle="A consolidated view of all stays. Minimal public-facing availability without exposing private booking details." icon={CalendarDays} />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg border border-border p-2 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date())} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg border border-border p-2 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-medium uppercase text-muted-foreground">{d}</div>
          ))}
          {weeks.flat().map((day, i) => {
            if (!day) return <div key={i} className="min-h-[88px] rounded-lg bg-secondary/30" />;
            const key = day.toISOString().slice(0, 10);
            const dayBookings = bookingsByDate[key] || [];
            const isToday = key === todayStr;
            return (
              <div key={i} className={`min-h-[88px] rounded-lg border p-1.5 ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary/40"}`}>
                <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.getDate()}</p>
                <div className="mt-1 space-y-1">
                  {dayBookings.slice(0, 3).map((b) => (
                    <Link key={b.id} to={`/bookings/${b.id}`} className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-medium border ${sourceColors[b.source] || "bg-secondary"}`}>
                      {b.guest_name}
                    </Link>
                  ))}
                  {dayBookings.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayBookings.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-rose-200 bg-rose-100" /> Airbnb</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-sky-200 bg-sky-100" /> VRBO</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-100" /> Direct</span>
      </div>
    </div>
  );
}
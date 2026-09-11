import React, { useEffect, useState } from "react";
import { CalendarClock, Check, X, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate, nightsBetween, formatCurrency, logAudit } from "@/lib/seaview";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function ReservationRequests() {
  const [requests, setRequests] = useState(null);
  const [guests, setGuests] = useState([]);

  async function load() {
    const [r, g] = await Promise.all([
      base44.entities.ReservationRequest.list("-created_date", 500),
      base44.entities.Guest.list("-created_date", 500),
    ]);
    setRequests(r);
    setGuests(g);
  }
  useEffect(() => { load(); }, []);

  const update = async (req, status, extra = {}) => {
    await base44.entities.ReservationRequest.update(req.id, { status, ...extra });
    await logAudit({ action: `reservation_${status}`, entityType: "ReservationRequest", entityId: req.id, after: { status } });
    load();
  };

  const convertToBooking = async (req) => {
    const sv = await (await import("@/lib/seaview")).nextSvNumber();
    const g = guests.find((x) => x.email === req.email || x.id === req.guest_id);
    const booking = await base44.entities.Booking.create({
      sv_number: sv, guest_id: g?.id || "", guest_name: req.guest_name, guest_user_id: req.guest_user_id,
      source: "direct", check_in: req.check_in, check_out: req.check_out, status: "confirmed",
      num_guests: req.num_guests, num_nights: nightsBetween(req.check_in, req.check_out),
      total_amount: req.quoted_total || 0, notes: `Converted from reservation request. ${req.notes || ""}`,
    });
    await base44.entities.ReservationRequest.update(req.id, { status: "converted" });
    await logAudit({ action: "convert_reservation_to_booking", entityType: "ReservationRequest", entityId: req.id, after: { booking_id: booking.id } });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reservation Requests" subtitle="Direct reservation requests submitted by approved returning guests through the portal." icon={CalendarClock} />

      {!requests?.length ? (
        <EmptyState icon={CalendarClock} title="No reservation requests" description="Requests from the guest portal will appear here for review." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{r.guest_name}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(r.check_in)} → {formatDate(r.check_out)} · {r.num_nights || nightsBetween(r.check_in, r.check_out)} nights · {r.num_guests} guests
                  </p>
                  {r.notes && <p className="mt-2 rounded-lg bg-secondary/50 p-2 text-sm">{r.notes}</p>}
                  {r.staff_notes && <p className="mt-1 text-xs text-muted-foreground">Staff notes: {r.staff_notes}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => convertToBooking(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"><FileText className="h-3.5 w-3.5" />Convert to Booking</button>
                    <button onClick={() => update(r, "approved")} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" />Approve</button>
                    <button onClick={() => update(r, "rejected")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Decline</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
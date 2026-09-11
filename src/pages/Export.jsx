import React, { useState } from "react";
import { Download, FileText, Database, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toCSV, downloadCSV, formatDate } from "@/lib/seaview";
import PageHeader from "@/components/PageHeader";

const entities = [
  { name: "Guest", label: "Guests", columns: [
    { key: "id", label: "ID" }, { key: "full_name", label: "Full Name" }, { key: "email", label: "Email" },
    { key: "phone", label: "Phone" }, { key: "address", label: "Address" }, { key: "city", label: "City" },
    { key: "country", label: "Country" }, { key: "status", label: "Status" }, { key: "invite_status", label: "Portal Status" },
    { key: "total_stays", label: "Total Stays" }, { key: "tags", label: "Tags" }, { key: "created_date", label: "Created" },
  ]},
  { name: "Booking", label: "Bookings", columns: [
    { key: "id", label: "ID" }, { key: "sv_number", label: "SV Number" }, { key: "guest_name", label: "Guest" },
    { key: "source", label: "Source" }, { key: "check_in", label: "Check In" }, { key: "check_out", label: "Check Out" },
    { key: "status", label: "Status" }, { key: "num_nights", label: "Nights" }, { key: "num_guests", label: "Guests" },
    { key: "total_amount", label: "Total" }, { key: "currency", label: "Currency" }, { key: "review_status", label: "Review" },
  ]},
  { name: "Invoice", label: "Invoices", columns: [
    { key: "id", label: "ID" }, { key: "invoice_number", label: "Invoice #" }, { key: "guest_name", label: "Guest" },
    { key: "booking_id", label: "Booking ID" }, { key: "issue_date", label: "Issue Date" }, { key: "due_date", label: "Due Date" },
    { key: "subtotal", label: "Subtotal" }, { key: "cleaning_fee", label: "Cleaning" }, { key: "tax", label: "Tax" },
    { key: "total", label: "Total" }, { key: "amount_paid", label: "Paid" }, { key: "balance", label: "Balance" }, { key: "status", label: "Status" },
  ]},
  { name: "Payment", label: "Payments", columns: [
    { key: "id", label: "ID" }, { key: "guest_name", label: "Guest" }, { key: "invoice_id", label: "Invoice ID" },
    { key: "booking_id", label: "Booking ID" }, { key: "amount", label: "Amount" }, { key: "type", label: "Type" },
    { key: "method", label: "Method" }, { key: "payment_date", label: "Date" }, { key: "reference", label: "Reference" },
  ]},
  { name: "Message", label: "Messages", columns: [
    { key: "id", label: "ID" }, { key: "guest_name", label: "Guest" }, { key: "direction", label: "Direction" },
    { key: "channel", label: "Channel" }, { key: "subject", label: "Subject" }, { key: "body", label: "Body" },
    { key: "sent_at", label: "Sent" }, { key: "status", label: "Status" },
  ]},
  { name: "ReviewRequest", label: "Review Requests", columns: [
    { key: "id", label: "ID" }, { key: "guest_name", label: "Guest" }, { key: "platform", label: "Platform" },
    { key: "sv_number", label: "SV Number" }, { key: "status", label: "Status" }, { key: "requested_at", label: "Requested" },
  ]},
  { name: "AuditLog", label: "Audit Log", columns: [
    { key: "id", label: "ID" }, { key: "actor_name", label: "Actor" }, { key: "actor_role", label: "Role" },
    { key: "action", label: "Action" }, { key: "entity_type", label: "Entity" }, { key: "entity_id", label: "Entity ID" },
    { key: "result", label: "Result" }, { key: "created_date", label: "Timestamp" },
  ]},
];

export default function Export() {
  const [exporting, setExporting] = useState(null);
  const [done, setDone] = useState([]);

  const exportOne = async (e) => {
    setExporting(e.name);
    try {
      const rows = await base44.entities[e.name].list("-created_date", 2000);
      const csv = toCSV(rows, e.columns);
      downloadCSV(`seaview_${e.label.toLowerCase().replace(/\s+/g, "_")}_${formatDate(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/[,/]/g, "-")}.csv`, csv);
      setDone((d) => [...d, e.name]);
    } catch (err) {
      alert("Export failed: " + (err.message || "unknown error"));
    } finally {
      setExporting(null);
    }
  };

  const exportAll = async () => {
    for (const e of entities) {
      await exportOne(e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Export & Backup" subtitle="One UTF-8 CSV file per core entity, with stable primary IDs and relationship fields. Portable backup for recovery outside the application." icon={Download}>
        <button onClick={exportAll} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Database className="h-4 w-4" /> Export All
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((e) => (
          <div key={e.name} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="font-medium text-foreground">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.columns.length} columns</p>
                </div>
              </div>
              {done.includes(e.name) && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </div>
            <button onClick={() => exportOne(e)} disabled={exporting === e.name} className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50">
              {exporting === e.name ? "Exporting…" : "Download CSV"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <h2 className="font-display text-lg font-semibold">Backup Package Contents</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>• One UTF-8 CSV file per core entity</li>
          <li>• Stable primary IDs and relationship fields preserved</li>
          <li>• Record counts and file checksums for reconciliation</li>
          <li>• Restore by importing guests before bookings, then invoices and payments</li>
        </ul>
      </div>
    </div>
  );
}
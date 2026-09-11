import React from "react";
import { statusTone, statusLabel } from "@/lib/seaview";

const toneClasses = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-sky-100 text-sky-800 border-sky-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function StatusBadge({ status, className = "" }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${toneClasses[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current opacity-70`} />
      {statusLabel(status)}
    </span>
  );
}
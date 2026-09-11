import React from "react";

export default function PageHeader({ title, subtitle, children, icon: Icon }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {Icon && <Icon className="mr-2 inline h-7 w-7 -translate-y-1 text-primary" />}
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
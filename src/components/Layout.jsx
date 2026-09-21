import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
  Receipt,
  CreditCard,
  MessageSquare,
  Star,
  HelpCircle,
  ScrollText,
  Download,
  Waves,
  Menu,
  X,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const nav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Guests", path: "/guests", icon: Users },
  { label: "Members", path: "/members", icon: UserCircle },
  { label: "Bookings", path: "/bookings", icon: CalendarDays },
  { label: "Calendar", path: "/calendar", icon: CalendarDays },
  { label: "Invoices", path: "/invoices", icon: Receipt },
  { label: "Payments", path: "/payments", icon: CreditCard },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Reservations", path: "/reservations", icon: CalendarClock },
  { label: "Review Requests", path: "/reviews", icon: Star },
  { label: "FAQs", path: "/faqs", icon: HelpCircle },
  { label: "Audit Log", path: "/audit", icon: ScrollText },
  { label: "Export", path: "/export", icon: Download },
];

export default function Layout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { user, logout } = useAuth();

  const me = user;
  const appRole = me?.appRole || me?.app_metadata?.role || me?.user_metadata?.role;
  const roleLabel = appRole === "admin" ? "Admin" : appRole === "staff" ? "Staff" : "Guest";

  const handleLogout = async () => {
    await logout(true);
  };

  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
          <Waves className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none text-white">Seaview</p>
          <p className="text-xs text-sidebar-foreground/70">Guest & Booking Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
              }`}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <Link
          to="/portal"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
        >
          <UserCircle className="h-4.5 w-4.5" />
          Guest Portal
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
          <Link
            to={me?.id ? `/members/${me.id}` : "/members"}
            className="-ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">
              {(me?.full_name || me?.email || "S").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{roleLabel}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{me?.email}</p>
            </div>
          </Link>
            <button onClick={() => setLogoutOpen(true)} className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to sign in again to access the dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 text-sidebar-foreground/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Top bar (mobile) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-foreground hover:bg-secondary">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold">Seaview</span>
        </div>
        <div className="w-9" />
      </div>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10"><Outlet /></div>
      </main>
    </div>
  );
}
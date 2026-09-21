import React, { startTransition, useEffect, useMemo, useState } from "react";
import { Mail, Search, ShieldCheck, UserPlus, UserCircle, CheckCircle2, XCircle, Users, Trash2, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const emptyMemberForm = {
  email: "",
  role: "staff",
};

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyMemberForm);
  const [formError, setFormError] = useState("");
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [presenceTick, setPresenceTick] = useState(Date.now());

  const canManageMembers = user?.appRole === "admin" || user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin";
  // Staff may invite staff; only administrators may change roles or account status.
  const canInviteMembers = canManageMembers || user?.appRole === "staff" || user?.app_metadata?.role === "staff" || user?.user_metadata?.role === "staff";

  const fetchMembers = async () => {
    if (!user?.id) return;
    setLoading(true);

    // No client-side role filter here on purpose: which rows come back is decided
    // by the RLS policy on public."User" (admins get every row, staff get rows
    // where role = 'staff'). Filtering again here would just hide rows the server
    // already excluded, and can't be relied on to hide anything the server sends.
    const { data, error } = await supabase
      .from("User")
      .select("id, email, full_name, role, status, avatar_url, last_seen_at")
      .order("full_name", { ascending: true });
    if (error) {
      console.error("Failed to load members:", error);
      setMembers([]);
      setFormError(`Could not load members: ${error.message}`);
    } else {
      setMembers(data || []);
      setFormError("");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return undefined;

    fetchMembers();

    // Mirrors the RLS policy: staff only get postgres_changes events for rows
    // where role = 'staff', so an admin row being edited never reaches them.
    const changeConfig = {
      event: "*",
      schema: "public",
      table: "User",
      ...(canManageMembers ? {} : { filter: "role=eq.staff" }),
    };

    const channel = supabase
      .channel(`member-presence-${user.id}`)
      .on("postgres_changes", changeConfig, (payload) => {
        startTransition(() => {
          setMembers((currentMembers) => {
            if (payload.eventType === "DELETE") {
              return currentMembers.filter((member) => member.id !== payload.old.id);
            }
            // Defence in depth: a role change from staff->admin should make the
            // row disappear for staff viewers even though it arrives as an UPDATE,
            // not a DELETE.
            if (!canManageMembers && (payload.new?.role || "staff") !== "staff") {
              return currentMembers.filter((member) => member.id !== payload.new.id);
            }
            if (payload.eventType === "INSERT") {
              if (currentMembers.some((member) => member.id === payload.new.id)) return currentMembers;
              return [...currentMembers, payload.new].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
            }
            return currentMembers.map((member) => (
              member.id === payload.new.id ? { ...member, ...payload.new } : member
            ));
          });
          setPresenceTick(Date.now());
        });
      })
      .subscribe();

    // Recalculate expired heartbeats locally without polling the database.
    const refreshPresence = window.setInterval(() => {
      setPresenceTick(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(refreshPresence);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canManageMembers]);

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => {
      const name = member.full_name || "";
      const email = member.email || "";
      const role = member.role || "";
      return [name, email, role].some((value) => value.toLowerCase().includes(term));
    });
  }, [members, query]);

  const visibleMembers = useMemo(() => {
    if (roleFilter === "all") return filteredMembers;
    return filteredMembers.filter((member) => (member.role || "staff") === roleFilter);
  }, [filteredMembers, roleFilter]);

  const memberCounts = useMemo(() => ({
    all: members.length,
    admin: members.filter((member) => member.role === "admin").length,
    staff: members.filter((member) => (member.role || "staff") === "staff").length,
  }), [members]);

  const handleInvite = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.email.trim()) {
      setFormError("Email is required.");
      return;
    }

    setSaving(true);
    try {
      // Use the server-side function so the service-role key never reaches the browser.
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          email: form.email.trim(),
          role: form.role,
        },
      });
      if (error) {
        let message = error.message;
        if (error.context) {
          try {
            const details = await error.context.json();
            message = details?.error || message;
          } catch {
            // Keep the SDK error when the response is not JSON.
          }
        }
        throw new Error(message || "Member invitation failed.");
      }
      if (data?.error) throw new Error(data.error);

      setForm(emptyMemberForm);
      setShowInviteForm(false);
      await fetchMembers();
    } catch (error) {
      console.error("Member invite failed:", error);
      setFormError(error.message || "Could not invite this member.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId, nextRole) => {
    const { error } = await supabase.from("User").update({ role: nextRole }).eq("id", memberId);
    if (error) {
      console.error("Role update failed:", error);
      return;
    }
    await fetchMembers();
  };

  const handleStatusToggle = async (memberId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("User").update({ status: nextStatus }).eq("id", memberId);
    if (error) {
      console.error("Status update failed:", error);
      return;
    }
    await fetchMembers();
  };

  // Deletion is confirmed in the UI and completed by the protected server function.
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-member", {
        body: { memberId: memberToDelete.id },
      });
      if (error) {
        let message = error.message;
        if (error.context) {
          try {
            const details = await error.context.json();
            message = details?.error || message;
          } catch {
            // Keep the SDK error when the response is not JSON.
          }
        }
        throw new Error(message || "Member deletion failed.");
      }
      if (data?.error) throw new Error(data.error);
      setMemberToDelete(null);
      await fetchMembers();
    } catch (error) {
      console.error("Member deletion failed:", error);
      setFormError(error.message || "Could not delete this member.");
      setMemberToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle="Manage staff access, roles, and account status." icon={Users}>
        {canInviteMembers && (
          <Button onClick={() => setShowInviteForm((open) => !open)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {showInviteForm ? "Close" : "Invite member"}
          </Button>
        )}
      </PageHeader>

      {formError && !showInviteForm && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {formError}
        </div>
      )}

      {showInviteForm && canInviteMembers && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="member@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="staff">Staff</option>
                {canManageMembers && <option value="admin">Admin</option>}
              </select>
            </div>

            {formError && <div className="md:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>}

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                {saving ? "Inviting..." : "Invite member"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          {[["all", "All members"], ...(canManageMembers ? [["admin", "Admins"], ["staff", "Staff"]] : [])].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRoleFilter(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${roleFilter === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}
            >
              {label} ({memberCounts[value]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Loading members...</div>
        ) : visibleMembers.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No members match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleMembers.map((member) => {
                  const status = member.status || "active";
                  const isActive = status === "active";
                  const isInactive = status !== "active";
                  const lastSeen = member.last_seen_at ? new Date(member.last_seen_at).getTime() : 0;
                  const isOnline = !isInactive && lastSeen > 0 && presenceTick - lastSeen < 90000;
                  const presenceLabel = isInactive ? "Inactive" : isOnline ? "Online" : "Offline";
                  const isAdmin = (member.role || "staff") === "admin";

                  return (
                    <tr key={member.id} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-semibold text-foreground">
                              {(member.full_name || member.email || "M").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{member.full_name || "Unnamed member"}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {canManageMembers ? (
                          <select
                            value={member.role || "staff"}
                            onChange={(event) => handleRoleChange(member.id, event.target.value)}
                            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                            {member.role || "staff"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${isOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : isInactive ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                          {isOnline ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {presenceLabel}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {canManageMembers && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStatusToggle(member.id, status)}
                                  disabled={user?.id === member.id}
                                >
                                  {isActive ? <XCircle className="text-muted-foreground" /> : <CheckCircle2 className="text-emerald-600" />}
                                  {isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                {user?.id !== member.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setMemberToDelete(member)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 />
                                      Delete member
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserCircle className="h-3.5 w-3.5" />
                            {isAdmin ? "Admin access" : "Staff access"}
                          </span>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(memberToDelete)} onOpenChange={(open) => !open && !deleting && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {memberToDelete?.full_name || memberToDelete?.email || "this member"} from the member database and removes their login account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteMember();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
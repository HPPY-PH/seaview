import React, { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isOwnProfile = user?.id === id;
  const isAdmin = user?.appRole === "admin" || user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin";

  useEffect(() => {
    const loadMember = async () => {
      const { data, error } = await supabase.from("User").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        setMessage({ type: "error", text: error?.message || "Member profile not found." });
      } else {
        setMember(data);
      }
      setLoading(false);
    };
    loadMember();
  }, [id]);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not change the password." });
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ type: "success", text: `Password reset email sent to ${member.email}.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not send the reset email." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Member profile" subtitle="View account details and manage the password." icon={UserCircle}>
        <Button variant="outline" onClick={() => navigate("/members")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to members
        </Button>
      </PageHeader>

      {member && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl font-semibold">
                  {(member.full_name || member.email || "M").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{member.full_name || "Unnamed member"}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{member.email}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs uppercase text-muted-foreground">Role</p><p className="mt-1 font-medium capitalize">{member.role}</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs uppercase text-muted-foreground">Status</p><p className="mt-1 font-medium capitalize">{member.status || "active"}</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Password</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isOwnProfile ? "Change the password for your account." : "Send this member a secure password reset email."}
            </p>

            {isOwnProfile ? (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
                <Button type="submit" disabled={saving} className="gap-2"><ShieldCheck className="h-4 w-4" />{saving ? "Saving..." : "Change password"}</Button>
              </form>
            ) : isAdmin ? (
              <Button type="button" onClick={handleSendReset} disabled={saving} className="mt-5 gap-2"><KeyRound className="h-4 w-4" />{saving ? "Sending..." : "Send reset email"}</Button>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">Only the member or an administrator can manage this password.</p>
            )}

            {message && <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}`} role="status">{message.text}</div>}
          </section>
        </div>
      )}
    </div>
  );
}

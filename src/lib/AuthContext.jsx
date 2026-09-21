import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

// Supabase's built-in "authenticated" role is not an application role.
const normalizeAppRole = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return ['admin', 'staff', 'guest'].includes(normalized) ? normalized : null;
};

const isPasswordRecoveryRoute = () => window.location.pathname === '/reset-password';
const hasPasswordRecoveryToken = () => window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appRole, setAppRole] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  const rejectUninvitedUser = async (message = 'Access is invitation-only. Please contact staff for access.') => {
    setAuthError({
      type: 'guest_not_invited',
      message,
    });
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn('Failed to sign out uninvited user:', signOutError);
    }
    setUser(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  useEffect(() => {
    // Recovery links can return to the site root; keep them on the password form.
    if (hasPasswordRecoveryToken() && !isPasswordRecoveryRoute()) {
      window.location.assign(`/reset-password${window.location.search}${window.location.hash}`);
      return undefined;
    }

    checkAppState();
    // Keep application state synchronized with Supabase login and logout events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUser(null);
        setIsAuthenticated(false);
        setAppRole(null);
        setAuthError(null);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      if (isPasswordRecoveryRoute()) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      setUser(session.user);
      setIsAuthenticated(true);
      setAuthError(null);
      await checkUserAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || !['admin', 'staff'].includes(appRole)) return undefined;

    // Heartbeat powers the Members online indicator without changing access status.
    const updateLastSeen = async () => {
      const { error } = await supabase
        .from('User')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) console.warn('Could not update member presence:', error);
    };

    updateLastSeen();
    const heartbeat = window.setInterval(updateLastSeen, 30000);
    return () => window.clearInterval(heartbeat);
  }, [user?.id, appRole]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
        
        // Always check the real Supabase session instead of a Base44 token.
        if (isPasswordRecoveryRoute()) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        } else {
          await checkUserAuth();
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      const invitedGuestId = currentUser.user_metadata?.invited_guest_id;

      // Only accept an invitation when the user was actually invited.
      // Uninvited users must not be treated as valid guests.
      if (invitedGuestId) {
        await base44.auth.acceptGuestInvitation(invitedGuestId, currentUser.email);
      }

      let profile = await base44.auth.getAppProfile(currentUser.id);
      let profileStatus = profile?.status || null;
      let role = normalizeAppRole(currentUser.app_metadata?.role) || normalizeAppRole(currentUser.user_metadata?.role) || normalizeAppRole(profile?.role);

      if (!role) {
        role = normalizeAppRole(profile?.role);
      }

      if (!role && currentUser.email) {
        const { data: emailMatch, error: emailError } = await supabase
          .from('User')
          .select('role, status, id, email')
          .eq('email', currentUser.email)
          .maybeSingle();
        if (emailError) throw emailError;
        profileStatus = emailMatch?.status || profileStatus;
        role = normalizeAppRole(emailMatch?.role);
      }

      if (['admin', 'staff'].includes(role)) {
        // Copy Google identity details into the app profile after the member signs in.
        const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;
        const providerName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
        if (avatarUrl || providerName) {
          const { error: avatarError } = await supabase
            .from('User')
            .update({
              ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
              ...(providerName ? { full_name: providerName } : {}),
            })
            .eq('id', currentUser.id);
          if (avatarError) console.warn('Could not update Google member profile:', avatarError);
        }

        // A new invitation may activate once; established inactive members stay blocked.
        if (profileStatus === 'inactive') {
          if (currentUser.user_metadata?.pending_member_invitation === true) {
            const { error: activationError } = await supabase.functions.invoke('activate-member');
            if (activationError) throw activationError;
            profileStatus = 'active';
          } else {
            await rejectUninvitedUser('Your account is inactive. Please contact an administrator for access.');
            return;
          }
        }

        // Keep the profile active after a successful staff or administrator login.
        const { error: statusError } = await supabase
          .from('User')
          .update({ status: 'active' })
          .eq('id', currentUser.id);
        if (statusError) console.warn('Could not activate member profile:', statusError);
      }

      setAppRole(role);
      // Guests must be linked to exactly one active invitation before portal access.
      if (!['admin', 'staff'].includes(role)) {
        const linkedGuest = await base44.auth.getLinkedGuest(currentUser.id);
        if (!linkedGuest || !['pending', 'accepted'].includes(linkedGuest.invite_status)) {
          await rejectUninvitedUser(
            linkedGuest
              ? 'Your invitation is not active. Please contact staff for access.'
              : 'Account does not exist in this application. Please contact staff for an invitation.'
          );
          return;
        }
      }
      setUser({ ...currentUser, appRole: role });
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error, {
        userId: error?.userId,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        message: error?.message,
      });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAppRole(null);
    
    // Supabase clears the session; the client optionally redirects to login.
    base44.auth.logout(shouldRedirect);
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      appRole,
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

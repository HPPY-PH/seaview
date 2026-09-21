import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const configuredAppUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  const allowedAppUrls = (Deno.env.get('APP_URLS') || configuredAppUrl || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const requestOrigin = request.headers.get('origin')?.replace(/\/$/, '');
  const appUrl = allowedAppUrls.includes(requestOrigin || '') ? requestOrigin : configuredAppUrl;
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !appUrl) {
    return json({ error: 'Member invitation service is not configured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: 'Authentication required' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile } = await adminClient
    .from('User')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();
  const callerRole = caller.app_metadata?.role || callerProfile?.role;
  if (!['admin', 'staff'].includes(callerRole)) {
    return json({ error: 'Only staff or administrators can invite members' }, 403);
  }

  let payload: { email?: string; role?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  // Enforce the staff-only invitation rule on the server, not just in the UI.
  const role = callerRole === 'admin' && payload.role === 'admin' ? 'admin' : 'staff';
  if (!email) return json({ error: 'Email is required' }, 400);

  const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/login`,
    data: { role, pending_member_invitation: true },
  });
  if (inviteError) return json({ error: inviteError.message }, 409);

  const memberId = invitation.user?.id;
  if (!memberId) return json({ error: 'Invitation was created without a user account' }, 500);

  const { error: profileError } = await adminClient
    .from('User')
    .upsert({
      id: memberId,
      email,
      full_name: '',
      role,
      // The schema allows active/inactive; first login promotes this to active.
      status: 'inactive',
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (profileError) return json({ error: profileError.message }, 500);

  return json({ success: true, memberId, status: 'inactive' });
});

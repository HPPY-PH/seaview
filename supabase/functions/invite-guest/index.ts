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
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Invitation service is not configured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: 'Authentication required' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await adminClient
    .from('User')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();
  const callerRole = caller.app_metadata?.role || profile?.role;
  if (!['admin', 'staff'].includes(callerRole)) {
    return json({ error: 'Only staff or administrators can invite guests' }, 403);
  }

  let payload: { guestId?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!payload.guestId) return json({ error: 'guestId is required' }, 400);

  const { data: guest, error: guestError } = await adminClient
    .from('Guest')
    .select('id, email, auth_user_id, invite_status')
    .eq('id', payload.guestId)
    .maybeSingle();

  if (guestError) return json({ error: guestError.message }, 500);
  if (!guest) return json({ error: 'Guest profile not found' }, 404);
  if (!guest.email) return json({ error: 'Guest email is required' }, 400);
  if (guest.auth_user_id) return json({ error: 'This guest already has a linked account' }, 409);

  const configuredAppUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  const allowedAppUrls = (Deno.env.get('APP_URLS') || configuredAppUrl || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const requestOrigin = request.headers.get('origin')?.replace(/\/$/, '');
  const appUrl = allowedAppUrls.includes(requestOrigin || '') ? requestOrigin : configuredAppUrl;
  if (!appUrl) return json({ error: 'APP_URL is not configured' }, 500);
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(guest.email, {
    redirectTo: `${appUrl}/portal`,
    data: { invited_guest_id: guest.id },
  });
  if (inviteError) return json({ error: inviteError.message }, 409);

  const { error: updateError } = await adminClient
    .from('Guest')
    .update({ invited: true, invite_status: 'pending' })
    .eq('id', guest.id);
  if (updateError) return json({ error: updateError.message }, 500);

  return json({ success: true, guestId: guest.id, inviteStatus: 'pending' });
});

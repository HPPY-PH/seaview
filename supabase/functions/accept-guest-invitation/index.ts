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

  let payload: { guestId?: string; email?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!payload.guestId && !payload.email) return json({ error: 'guestId or email is required' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let guestQuery = adminClient
    .from('Guest')
    .select('id, email, auth_user_id, invite_status, status');
  guestQuery = payload.guestId
    ? guestQuery.eq('id', payload.guestId)
    : guestQuery.ilike('email', payload.email!.trim());
  const { data: guest, error: guestError } = await guestQuery.maybeSingle();

  if (guestError) return json({ error: guestError.message }, 500);
  if (!guest) return json({ error: 'Guest profile not found' }, 404);
  if (guest.email?.toLowerCase() !== caller.email?.toLowerCase()) {
    return json({ error: 'The invitation email does not match this account' }, 403);
  }
  if (guest.auth_user_id && guest.auth_user_id !== caller.id) {
    return json({ error: 'This guest profile is already linked to another account' }, 409);
  }
  if (!['pending', 'accepted'].includes(guest.invite_status)) {
    return json({ error: 'This invitation is not active' }, 409);
  }

  const { error: updateError } = await adminClient
    .from('Guest')
    .update({ auth_user_id: caller.id, invited: true, invite_status: 'accepted', status: 'active' })
    .eq('id', guest.id);
  if (updateError) return json({ error: updateError.message }, 500);

  return json({ success: true, guestId: guest.id, inviteStatus: 'accepted' });
});

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
    return json({ error: 'Member deletion service is not configured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: 'Authentication required' }, 401);

  let payload: { memberId?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!payload.memberId) return json({ error: 'memberId is required' }, 400);
  // Protect the currently signed-in administrator from deleting their own access.
  if (payload.memberId === caller.id) return json({ error: 'You cannot delete your own account' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile } = await adminClient
    .from('User')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();
  const callerRole = caller.app_metadata?.role || callerProfile?.role;
  if (callerRole !== 'admin') return json({ error: 'Only administrators can delete members' }, 403);

  const { data: member, error: memberError } = await adminClient
    .from('User')
    .select('id, email, full_name')
    .eq('id', payload.memberId)
    .maybeSingle();
  if (memberError) return json({ error: memberError.message }, 500);
  if (!member) return json({ error: 'Member profile not found' }, 404);

  // Remove the application profile before removing the matching Auth account.
  const { error: profileError } = await adminClient
    .from('User')
    .delete()
    .eq('id', payload.memberId);
  if (profileError) return json({ error: profileError.message }, 409);

  const { error: authError } = await adminClient.auth.admin.deleteUser(payload.memberId);
  if (authError) {
    return json({ error: `Profile deleted, but the authentication account could not be deleted: ${authError.message}` }, 502);
  }

  return json({ success: true, memberId: member.id });
});

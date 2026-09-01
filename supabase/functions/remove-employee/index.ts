import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing bearer token' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase server configuration' }, 500);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: actor, error: actorError } = await adminClient
      .from('employees')
      .select('id, user_id, role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();
    if (actorError) return json({ error: actorError.message }, 500);
    if (!actor || actor.is_active === false || !['admin', 'super_admin'].includes(actor.role)) {
      return json({ error: 'Administrator access required' }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const employeeId = typeof payload.employee_id === 'string' ? payload.employee_id : '';
    if (!employeeId) return json({ error: 'Employee id is required' }, 400);
    if (employeeId === actor.id) return json({ error: 'You cannot remove your own administrator account' }, 400);

    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id, user_id, full_name, email')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) return json({ error: employeeError.message }, 500);
    if (!employee) return json({ error: 'Employee not found' }, 404);

    // Delete all attendance records first to satisfy foreign key constraints.
    const { error: attendancesError } = await adminClient
      .from('attendances')
      .delete()
      .eq('employee_id', employee.id);
    if (attendancesError) return json({ error: `Erreur lors de la suppression de l'historique: ${attendancesError.message}` }, 500);

    // Delete the employee record.
    const { error: deleteProfileError } = await adminClient
      .from('employees')
      .delete()
      .eq('id', employee.id);
    if (deleteProfileError) return json({ error: `Erreur lors de la suppression du profil: ${deleteProfileError.message}` }, 500);

    // Revoke authentication access.
    if (employee.user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(employee.user_id);
      if (deleteAuthError) {
        return json({
          success: true,
          deleted: true,
          warning: `Profil et historique supprimés, mais le compte Auth n'a pas pu être supprimé: ${deleteAuthError.message}`,
        }, 200);
      }
    }

    return json({ success: true, deleted: true, employee_id: employee.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

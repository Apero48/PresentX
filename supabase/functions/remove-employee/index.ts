import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Vérifier que l'appelant est authentifié et admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Non autorisé' }, 401);

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceRoleKey || !supabaseUrl) {
    return json({ error: 'Configuration Supabase manquante' }, 500);
  }

  // Client avec la clé anon pour vérifier l'identité de l'appelant
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const callerClient = createClient(supabaseUrl, anonKey!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: 'Non authentifié' }, 401);

  // Vérifier que l'utilisateur est admin dans la table employees
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerEmployee } = await adminClient
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const callerRole = (
    callerEmployee?.role ||
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    ''
  ).toLowerCase();

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return json({ error: 'Accès refusé. Seul un administrateur peut supprimer un compte.' }, 403);
  }

  // Récupérer l'employee_id dans le body
  let body: { employee_id?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps de la requête invalide' }, 400);
  }

  const { employee_id } = body;
  if (!employee_id) return json({ error: 'employee_id est requis' }, 400);

  // Récupérer l'employé pour obtenir son user_id
  const { data: employeeToDelete, error: fetchError } = await adminClient
    .from('employees')
    .select('id, user_id, full_name, email')
    .eq('id', employee_id)
    .single();

  if (fetchError || !employeeToDelete) {
    return json({ error: 'Employé introuvable' }, 404);
  }

  // 1. Supprimer les présences de l'employé
  const { error: attendanceError } = await adminClient
    .from('attendances')
    .delete()
    .eq('employee_id', employee_id);

  if (attendanceError) {
    return json({ error: `Erreur suppression présences: ${attendanceError.message}` }, 500);
  }

  // 2. Supprimer le profil employé
  const { error: employeeError } = await adminClient
    .from('employees')
    .delete()
    .eq('id', employee_id);

  if (employeeError) {
    return json({ error: `Erreur suppression employé: ${employeeError.message}` }, 500);
  }

  // 3. Supprimer le compte Auth Supabase (si un user_id existe)
  if (employeeToDelete.user_id) {
    const { error: authError } = await adminClient.auth.admin.deleteUser(employeeToDelete.user_id);
    if (authError) {
      // Le profil est déjà supprimé, on logue l'erreur mais on retourne succès partiel
      return json({
        success: true,
        partial: true,
        message: `Profil supprimé, mais erreur suppression compte auth: ${authError.message}`,
        employee_name: employeeToDelete.full_name,
      });
    }
  }

  return json({
    success: true,
    message: `Le compte de ${employeeToDelete.full_name} a été supprimé avec succès.`,
    employee_name: employeeToDelete.full_name,
  });
});

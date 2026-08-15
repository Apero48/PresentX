import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const allowedOrigin = Deno.env.get('APP_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isAdmin = (user: any, employee: any) => {
  const role = String(
    employee?.role || user?.app_metadata?.role || user?.user_metadata?.role || ''
  ).toLowerCase();

  // Keep compatibility with the current project while the role migration is applied.
  const legacyAdminEmail = (user?.email || '').toLowerCase();
  return role === 'admin' || role === 'super_admin' || legacyAdminEmail === 'admin@presencex.com';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Authentification requise' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuration Supabase manquante' }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return json({ error: 'Session invalide' }, 401);

    const { data: callerEmployee, error: callerError } = await adminClient
      .from('employees')
      .select('email, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (callerError) return json({ error: 'Impossible de vérifier les droits administrateur' }, 500);
    if (!isAdmin(user, callerEmployee)) return json({ error: 'Droits administrateur requis' }, 403);

    const payload = await req.json();
    const fullName = String(payload.full_name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const department = String(payload.department || 'Non défini').trim();
    const position = String(payload.position || 'Employé').trim();
    const phone = String(payload.phone || '').trim();
    const startTime = String(payload.start_time || '09:00').trim();
    const employeeCode = String(payload.employee_code || '').trim();

    if (!fullName || !email || !password || !department) return json({ error: 'Nom, email, mot de passe et département sont obligatoires' }, 400);
    if (password.length < 8) return json({ error: 'Le mot de passe initial doit contenir au moins 8 caractères' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Adresse email invalide' }, 400);

    const { data: existingEmployee } = await adminClient
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingEmployee) return json({ error: 'Un profil employé utilise déjà cet email' }, 409);

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'employee' },
    });
    if (createAuthError || !createdAuth.user) return json({ error: createAuthError?.message || 'Impossible de créer le compte' }, 400);

    const userId = createdAuth.user.id;
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        full_name: fullName,
        email,
        phone,
        department,
        position,
        employee_code: employeeCode || `EMP${Date.now().toString().slice(-6)}`,
        qr_code: `QR-${userId}`,
        start_time: startTime,
        is_active: true,
        user_id: userId,
        role: 'employee',
      })
      .select()
      .single();

    if (employeeError) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: 'Le profil employé n’a pas pu être créé' }, 400);
    }

    return json({ success: true, employee });
  } catch (error) {
    console.error('create-employee error', error);
    return json({ error: 'Erreur interne lors de la création du compte' }, 500);
  }
});

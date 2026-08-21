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

const timeToMinutes = (value: string) => {
  const [hour, minute] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return NaN;
  return hour * 60 + minute;
};

const currentLocalTime = () => {
  const timeZone = Deno.env.get('APP_TIMEZONE') || 'Africa/Algiers';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
};

const currentLocalDate = () => {
  const timeZone = Deno.env.get('APP_TIMEZONE') || 'Africa/Algiers';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
};

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
      .select('id, user_id, email, role, is_active, start_time')
      .eq('user_id', user.id)
      .maybeSingle();
    if (actorError) return json({ error: actorError.message }, 500);
    if (!actor || actor.is_active === false) return json({ error: 'Employee profile not found or inactive' }, 403);

    const isAdmin = actor.role === 'admin' || actor.role === 'super_admin';
    const { action, payload = {} } = await req.json();
    const directActionKeys = ['lunch_start', 'lunch_end', 'intervention_start', 'intervention_end', 'interventions', 'check_out'];
    const normalizedAction = directActionKeys.includes(action) ? 'update-attendance' : action;
    const normalizedPayload = directActionKeys.includes(action)
      ? { ...payload, actionKey: payload.actionKey || action }
      : payload;
    const nowTime = currentLocalTime();
    const nowDate = currentLocalDate();
    const nowMinutes = timeToMinutes(nowTime);

        if (normalizedAction === 'health') return json({ status: 'ok', userId: user.id, role: actor.role });
    if (normalizedAction === 'create-attendance') {
      const employeeId = normalizedPayload.employee_id || actor.id;

      if (!isAdmin && employeeId !== actor.id) return json({ error: 'Employees can only create their own attendance' }, 403);
      const date = normalizedPayload.date || nowDate;
      const isOfflineSync = normalizedPayload.offline === true;
      if (!isOfflineSync && nowMinutes > 19 * 60) {
        return json({ error: 'Attendance is closed after 19:00' }, 422);
      }
      const checkInTime = isOfflineSync ? String(normalizedPayload.check_in || '') : nowTime;
      const checkInMinutes = timeToMinutes(checkInTime);
      if (isOfflineSync && (Number.isNaN(checkInMinutes) || checkInMinutes > 19 * 60)) {
        return json({ error: 'Offline check-in time is after 19:00' }, 422);
      }
      const { data: existing } = await adminClient.from('attendances')
        .select('id').eq('employee_id', employeeId).eq('date', date).maybeSingle();
      if (existing) return json({ error: 'Attendance already exists for this employee today' }, 409);

      const { data: employee } = await adminClient.from('employees')
        .select('id, full_name, start_time, is_active').eq('id', employeeId).maybeSingle();
      if (!employee || employee.is_active === false) return json({ error: 'Employee not found or inactive' }, 404);

      const startMinutes = timeToMinutes(employee.start_time || '08:00');
      const status = checkInMinutes > startMinutes + 15 ? 'late' : 'present';
      const { data, error } = await adminClient.from('attendances').insert({
        employee_id: employeeId,
        employee_name: employee.full_name,
        date,
        check_in: checkInTime,
        status,
        interventions: [],
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, attendance: data });
    }

    if (normalizedAction === 'update-attendance') {
      const attendanceId = normalizedPayload.id;
      if (!attendanceId) return json({ error: 'Attendance id is required' }, 400);
      const { data: existing, error: existingError } = await adminClient
        .from('attendances').select('*').eq('id', attendanceId).maybeSingle();
      if (existingError) return json({ error: existingError.message }, 500);
      if (!existing) return json({ error: 'Attendance not found' }, 404);
      if (!isAdmin && existing.employee_id !== actor.id) return json({ error: 'You can only update your own attendance' }, 403);
      if (nowMinutes > 19 * 60) return json({ error: 'Attendance is closed after 19:00' }, 422);

      let changes: Record<string, unknown> = {};
      if (isAdmin) {
        const allowed = ['check_in', 'check_out', 'lunch_start', 'lunch_end', 'hours_worked', 'status', 'interventions', 'employee_name', 'date'];
                  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(normalizedPayload.data || {}, key)) changes[key] = normalizedPayload.data[key];

      } else {
        const actionKey = normalizedPayload.actionKey;
        if (actionKey === 'lunch_start') changes = { lunch_start: nowTime };
        else if (actionKey === 'lunch_end') changes = { lunch_end: nowTime };
        else if (actionKey === 'check_out') {
          if (existing.check_out) return json({ error: 'Attendance is already closed' }, 409);
          const checkIn = timeToMinutes(existing.check_in);
          const lunchStart = timeToMinutes(existing.lunch_start);
          const lunchEnd = timeToMinutes(existing.lunch_end);
          const lunchMinutes = Number.isFinite(lunchStart) && Number.isFinite(lunchEnd) ? lunchEnd - lunchStart : 0;
          const hoursWorked = Math.max(0, (nowMinutes - checkIn - lunchMinutes) / 60);
          changes = { check_out: nowTime, hours_worked: hoursWorked.toFixed(2) };
        } else if (actionKey === 'interventions') {
          changes = { interventions: normalizedPayload.data?.interventions || [] };
        } else return json({ error: 'Unsupported employee attendance action' }, 400);
      }

      const { data, error } = await adminClient.from('attendances').update(changes).eq('id', attendanceId).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, attendance: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected server error' }, 500);
  }
});

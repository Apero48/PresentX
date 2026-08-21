import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CLOSE_HOUR = 19;
const CLOSE_MINUTE = 15;
const CRON_SECRET = Deno.env.get('ATTENDANCE_CRON_SECRET') || '';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const timeToMinutes = (value: unknown) => {
  if (typeof value !== 'string') return Number.NaN;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
};

const localParts = (date = new Date()) => {
  const timezone = Deno.env.get('APP_TIMEZONE') || 'Europe/Paris';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const suppliedSecret = req.headers.get('x-attendance-cron-secret') || '';
  if (!CRON_SECRET || suppliedSecret !== CRON_SECRET) return json({ error: 'Unauthorized' }, 401);

  const now = localParts();
  if (now.minutes < CLOSE_HOUR * 60 + CLOSE_MINUTE) {
    return json({ success: true, closed: 0, message: 'Automatic closure is not due yet', local_time: now.time });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceRoleKey || !supabaseUrl) return json({ error: 'Supabase configuration is missing' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: openAttendances, error: selectError } = await admin
    .from('attendances')
    .select('id, check_in, lunch_start, lunch_end, check_out')
    .eq('date', now.date)
    .is('check_out', null);

  if (selectError) return json({ error: selectError.message }, 500);

  let closed = 0;
  const errors: string[] = [];
  for (const attendance of openAttendances || []) {
    const checkIn = timeToMinutes(attendance.check_in);
    if (!Number.isFinite(checkIn)) {
      errors.push(`${attendance.id}: invalid check_in`);
      continue;
    }
    const lunchStart = timeToMinutes(attendance.lunch_start);
    const lunchEnd = timeToMinutes(attendance.lunch_end);
    const lunchMinutes = Number.isFinite(lunchStart) && Number.isFinite(lunchEnd)
      ? Math.max(0, lunchEnd - lunchStart)
      : 0;
    const hoursWorked = Math.max(0, (CLOSE_HOUR * 60 + CLOSE_MINUTE - checkIn - lunchMinutes) / 60);

    const { error: updateError } = await admin
      .from('attendances')
      .update({ check_out: '19:15', hours_worked: hoursWorked.toFixed(2) })
      .eq('id', attendance.id)
      .is('check_out', null);

    if (updateError) errors.push(`${attendance.id}: ${updateError.message}`);
    else closed += 1;
  }

  return json({ success: errors.length === 0, closed, errors, date: now.date, close_time: '19:15' });
});

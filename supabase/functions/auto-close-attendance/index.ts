import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase server configuration' }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const timeZone = Deno.env.get('APP_TIMEZONE') || 'Africa/Algiers';
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const nowHour = Number(nowParts.find((part) => part.type === 'hour')?.value || 0);
  const nowMinute = Number(nowParts.find((part) => part.type === 'minute')?.value || 0);
  if (nowHour * 60 + nowMinute < 21 * 60 + 30) {
    return json({ success: true, closed: 0, skipped: true, message: 'Automatic closure starts at 21:30.' });
  }
  const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

  try {
    const { data: openAttendances, error: selectError } = await adminClient
      .from('attendances')
      .select('id, check_in, lunch_start, lunch_end')
      .eq('date', date)
      .is('check_out', null);
    if (selectError) return json({ error: selectError.message }, 500);

    let closed = 0;
    for (const attendance of openAttendances || []) {
      const parseTime = (value: string) => {
        const [hour, minute] = String(value || '').split(':').map(Number);
        return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : NaN;
      };
      const checkIn = parseTime(attendance.check_in);
      const lunchStart = parseTime(attendance.lunch_start);
      const lunchEnd = parseTime(attendance.lunch_end);
      const lunchMinutes = Number.isFinite(lunchStart) && Number.isFinite(lunchEnd) ? lunchEnd - lunchStart : 0;
      const hoursWorked = Number.isFinite(checkIn)
        ? Math.max(0, (19 * 60 - checkIn - lunchMinutes) / 60).toFixed(2)
        : null;

      const { error: updateError } = await adminClient
        .from('attendances')
        .update({ check_out: '19:00', hours_worked: hoursWorked })
        .eq('id', attendance.id)
        .is('check_out', null);
      if (!updateError) closed += 1;
    }

    return json({ success: true, date, closed, automatic_departure: '19:00' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

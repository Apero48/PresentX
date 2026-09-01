// Auto-close désactivé à la demande du patron.
// Les employés doivent scanner eux-mêmes leur départ, même après 19h.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  // La fermeture automatique est désactivée.
  // Les employés pointent eux-mêmes leur départ, quelle que soit l'heure.
  return json({
    success: true,
    closed: 0,
    disabled: true,
    message: 'La fermeture automatique des pointages est désactivée. Les employés doivent scanner leur départ manuellement.',
  });
});

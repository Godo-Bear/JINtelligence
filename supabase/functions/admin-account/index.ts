// JINtelligence — admin account help (Supabase Edge Function "admin-account").
// Lets an ADMIN fix a student's login: correct a misspelt email and/or set a temporary password.
// Passwords are never shown or stored in a readable form — the admin just sets a new one.
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to every edge function automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Only logged-in admins may use this.
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: who } = await admin.auth.getUser(jwt);
    if (!who?.user) return json({ error: 'Please log in again.' }, 401);
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', who.user.id).maybeSingle();
    if (!me?.is_admin) return json({ error: 'Only admins can do this.' }, 403);

    const { userId, email, password } = await req.json();
    if (!userId || typeof userId !== 'string') return json({ error: 'No account chosen.' }, 400);
    const changes: Record<string, unknown> = {};
    if (email) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return json({ error: "That email doesn't look right." }, 400);
      changes.email = clean;
      changes.email_confirm = true;
    }
    if (password) {
      if (String(password).length < 6) return json({ error: 'The password needs at least 6 characters.' }, 400);
      changes.password = String(password);
    }
    if (!Object.keys(changes).length) return json({ error: 'Nothing to change.' }, 400);

    const { data, error } = await admin.auth.admin.updateUserById(userId, changes);
    if (error) return json({ error: /already/i.test(error.message) ? 'Another account already uses that email.' : error.message }, 400);
    if (changes.email) await admin.from('profiles').update({ email: changes.email }).eq('id', userId);
    return json({ ok: true, email: data.user?.email });
  } catch (err) {
    console.error('admin-account error:', err);
    return json({ error: 'Something went wrong.' }, 500);
  }
});

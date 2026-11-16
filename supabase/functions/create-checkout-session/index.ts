// JINtelligence — start an online payment (Supabase Edge Function "create-checkout-session").
// Paste into Supabase → Edge Functions → create-checkout-session → Code, then press Deploy.
// Needs two secrets set on this function (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY      — your Stripe secret key (starts with sk_)
// Until that secret is set, this politely declines instead of erroring, so it's safe to deploy early.
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Plans, in cents AUD — keep in step with the prices shown on the sign-up screen and in the Terms.
const PLANS: Record<number, { cents: number; label: string }> = {
  1: { cents: 700, label: '1 month' },
  6: { cents: 1500, label: '6 months' },
};
const CURRENCY = 'aud';
const FALLBACK_SITE_URL = 'https://jintelligence.jn-studios.workers.dev';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) return json({ error: "Online payments aren't set up yet — pay cash in hand instead, or ask the site owner." }, 503);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: who } = await admin.auth.getUser(jwt);
    if (!who?.user) return json({ error: 'Please log in again.' }, 401);

    const { origin } = await req.json().catch(() => ({ origin: '' }));
    const site = typeof origin === 'string' && /^https:\/\//.test(origin) ? origin : FALLBACK_SITE_URL;

    // The student's chosen plan (set at sign-up); defaults to 6 months if it isn't recorded.
    const { data: prof } = await admin.from('profiles').select('plan_months').eq('id', who.user.id).maybeSingle();
    const months = PLANS[prof?.plan_months as number] ? (prof!.plan_months as number) : 6;
    const plan = PLANS[months];

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: who.user.email,
      // Carries the student's id through to the webhook, which has no other way to know who paid.
      client_reference_id: who.user.id,
      metadata: { months: String(months) },
      line_items: [{
        price_data: {
          currency: CURRENCY,
          unit_amount: plan.cents,
          product_data: { name: `JINtelligence — ${plan.label} access` },
        },
        quantity: 1,
      }],
      success_url: `${site}/#/settings`,
      cancel_url: `${site}/#/settings`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return json({ error: 'Something went wrong starting checkout — try again, or pay cash in hand.' }, 500);
  }
});

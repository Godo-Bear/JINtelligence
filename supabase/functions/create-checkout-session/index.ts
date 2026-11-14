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

// Six months of access, in cents AUD — keep this in step with the $10 AUD / 6 months price in the Terms.
const PRICE_CENTS = 1000;
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

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: who.user.email,
      // Carries the student's id through to the webhook, which has no other way to know who paid.
      client_reference_id: who.user.id,
      line_items: [{
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: { name: 'JINtelligence — 6 months access' },
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

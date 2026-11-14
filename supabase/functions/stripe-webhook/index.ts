// JINtelligence — handle a completed online payment (Supabase Edge Function "stripe-webhook").
// Paste into Supabase → Edge Functions → stripe-webhook → Code, then press Deploy.
// Needs two secrets set on this function (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY       — same secret key as create-checkout-session (starts with sk_)
//   STRIPE_WEBHOOK_SECRET   — the signing secret for the webhook endpoint (starts with whsec_),
//                             shown by Stripe when you add this function's URL as a webhook endpoint
//                             listening for the "checkout.session.completed" event.
// This endpoint is called directly by Stripe's servers, not by the website — it checks Stripe's
// signature instead of a user login. Needs the "payments" table (see the setup notes) to record which
// Stripe sessions have already been processed, so a retried webhook delivery can't double-extend access.
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secretKey || !webhookSecret) return new Response('Stripe is not configured on this function yet.', { status: 503 });

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Deno's crypto is async-only, so this needs the async variant (Stripe's own recommendation for edge runtimes).
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (err) {
    console.error('stripe-webhook: bad signature —', err);
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) { console.error('stripe-webhook: no client_reference_id on session', session.id); return new Response('ok'); }

      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

      // Idempotency: Stripe can deliver the same event more than once. If we've already logged this
      // checkout session, skip straight to "ok" instead of extending access a second time.
      const { data: already } = await admin.from('payments').select('id').eq('stripe_session_id', session.id).maybeSingle();
      if (!already) {
        await admin.from('payments').insert({
          user_id: userId, stripe_session_id: session.id,
          amount_cents: session.amount_total, currency: session.currency,
        });

        // Extend from the later of today or the current expiry — the same rule the admin's own
        // "Renew 6 months" button uses, so online and manual renewals behave the same way.
        const { data: profile } = await admin.from('profiles').select('paid_until').eq('id', userId).maybeSingle();
        const from = profile?.paid_until && new Date(profile.paid_until) > new Date() ? new Date(profile.paid_until) : new Date();
        const until = new Date(from);
        until.setMonth(until.getMonth() + 6);
        await admin.from('profiles').update({ has_paid: true, paid_until: until.toISOString(), deleted: false }).eq('id', userId);
      }
    }
    return new Response('ok');
  } catch (err) {
    console.error('stripe-webhook error:', err);
    // A 500 here makes Stripe retry the webhook later, which is what we want for a real failure.
    return new Response('Something went wrong.', { status: 500 });
  }
});

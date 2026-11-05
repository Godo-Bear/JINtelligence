// JINtelligence — tutor voice (Supabase Edge Function "tutor-voice").
// Turns the tutor's reply into natural speech with Microsoft Azure Speech.
// Needs two secrets in Supabase → Edge Functions → Secrets: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (e.g. australiaeast).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Only these voices can be used (Australian English neural voices).
const VOICES = ['en-AU-WilliamNeural', 'en-AU-NatashaNeural'];
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { text, voice, rate } = await req.json();
    if (!text || typeof text !== 'string') return json({ error: 'No text' }, 400);
    const key = Deno.env.get('AZURE_SPEECH_KEY'), region = Deno.env.get('AZURE_SPEECH_REGION');
    if (!key || !region) return json({ error: 'Azure Speech is not set up — add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in Supabase secrets.' }, 500);

    const name = VOICES.includes(voice) ? voice : VOICES[0];
    const pct = Math.round((Math.min(1.5, Math.max(0.7, Number(rate) || 1)) - 1) * 100);
    const ssml = `<speak version="1.0" xml:lang="en-AU"><voice name="${name}"><prosody rate="${pct >= 0 ? '+' : ''}${pct}%">${xml(text.slice(0, 1500))}</prosody></voice></speak>`;

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'jintelligence-tutor',
      },
      body: ssml,
    });
    if (!res.ok) {
      console.error('Azure Speech error:', res.status, await res.text().catch(() => ''));
      return json({ error: `Azure Speech error ${res.status}` }, 502);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return json({ audio: btoa(bin), type: 'audio/mpeg' });
  } catch (err) {
    console.error('tutor-voice error:', err);
    return json({ error: 'Something went wrong' }, 500);
  }
});

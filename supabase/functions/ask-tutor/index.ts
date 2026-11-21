// JINtelligence — AI tutor (Supabase Edge Function "ask-tutor").
// Paste into Supabase → Edge Functions → ask-tutor → Code, then press Deploy.
// Uses the GEMINI_API_KEY secret that is already set up.

import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'gemini-3.5-flash';
// If the main model is overloaded, out of quota or not found, the next one is tried so students still get an answer.
const MODELS = [MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You are the AI tutor for JINtelligence, a study website for learners of any age and level, mostly in Victoria, Australia: primary school, high school, VCE, university, TAFE and adult learners.

Help with ANY subject or learning topic, at any level: maths (from counting to calculus), English and literature, every science, history, geography, economics, business, legal studies, psychology, health and PE, languages, the arts, music, drama, digital technologies and coding, VCE subjects, uni and TAFE topics, study skills, general knowledge, and ideas for assignments, projects and stories. Follow the Victorian Curriculum and VCE study designs where they apply.

How to help:
- Be friendly, encouraging and patient.
- Pitch every answer at the student's level. If the request says what level they're at, follow that. Otherwise work it out from what they ask and how they write, and if you can't tell, explain clearly for a young teenager and offer to make it simpler or go deeper.
- Make sure every fact, answer and calculation is correct. If you're not sure about something, say so.
- For homework-style questions, help the student understand and guide them through the steps rather than just handing over a finished assignment to copy.
- Keep everything school-appropriate, because many students are children. If asked about something unsafe or inappropriate, kindly decline and suggest a better topic. If a student seems upset or unsafe, gently encourage them to talk to a trusted adult, and mention Kids Helpline (1800 55 1800), or Lifeline (13 11 14) for adults.

Formatting:
- When the request asks for JSON, reply with ONLY that JSON, exactly in the format asked for, with no other text and no code fences.
- Otherwise write plain text: no Markdown (no **, no #), no LaTeX ($$). Use × and ÷ for times and divide. Keep chat answers fairly short unless the student asks for more detail.`;

const DIAGRAM_INSTRUCTIONS = ` If (and only if) a picture would genuinely help explain your answer, you may add ONE diagram at the very end in this exact format: [DIAGRAM]{one JSON object on one line}[/DIAGRAM]. The numbers below are placeholders showing the format only; always use the real values from the question. Allowed shapes: Number line {"type":"number_line","min":0,"max":10,"step":1,"points":[{"value":4,"label":"x"}]} | Bar chart {"type":"bar_chart","labels":["Mon","Tue"],"values":[3,7]} | Rectangle {"type":"shape","shape":"rectangle","dimensions":{"width":8,"height":5}} | Triangle {"type":"shape","shape":"triangle","dimensions":{"base":6,"heightVal":4}} | Circle {"type":"shape","shape":"circle","dimensions":{"radius":4}} | Fraction circle {"type":"fraction_circle","numerator":3,"denominator":4} | Coordinate plane {"type":"coordinate_plane","range":10,"points":[{"x":3,"y":4,"label":"A"}]} | Triangle angles {"type":"triangle_angles","angles":[{"value":40,"label":"40°"},{"value":65,"label":"65°"},{"value":75,"label":"75°"}]} | Angle pair {"type":"angle_pair","angles":[{"value":120,"label":"120°"},{"value":60,"label":"60°"}]}. Most answers need no diagram.`;

// The website asks for JSON with phrases like "Reply with ONLY valid JSON".
const wantsJson = (q: string) => /(reply|respond) with only (a )?valid json/i.test(q);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Parent accounts are view-only: they can't use the AI (so one can't be handed to a child as a free account).
    // If the check itself fails for any reason we let the request through, so students are never locked out by a glitch.
    try {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { data: who } = await admin.auth.getUser(jwt);
      if (who?.user) {
        const { data: prof } = await admin.from('profiles').select('account_type, is_admin').eq('id', who.user.id).maybeSingle();
        if (prof?.account_type === 'parent' && !prof?.is_admin) return json({ error: 'Parent accounts are view-only. The AI tutor is for student accounts.' }, 403);
      }
    } catch (_) { /* fail open */ }

    const { question, image, imageMimeType, allowDiagram } = await req.json();
    if (!question || typeof question !== 'string') return json({ error: 'No question provided' }, 400);
    if (question.length > 60000) return json({ error: 'That message is too long — try a shorter one.' }, 400);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'The AI key is missing — add GEMINI_API_KEY in Supabase secrets.' }, 500);

    // The question, plus a photo of the student's working if they attached one.
    const parts: Record<string, unknown>[] = [{ text: question }];
    if (typeof image === 'string' && image.length) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/s);
      const data = match ? match[2] : image;
      const mimeType = match ? match[1] : (imageMimeType || 'image/jpeg');
      if (data.length < 8_000_000) parts.push({ inlineData: { mimeType, data } });
    }

    const asJson = wantsJson(question);
    const body = {
      contents: [{ role: 'user', parts }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT + (allowDiagram && !asJson ? DIAGRAM_INSTRUCTIONS : '') }] },
      generationConfig: {
        maxOutputTokens: 16384, // room for big tests, decks and info pages
        ...(asJson ? { responseMimeType: 'application/json' } : {}),
      },
    };

    let data: any = null;
    let lastError: any = null;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      const model = MODELS[Math.min(attempt, MODELS.length - 1)];
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      data = await response.json().catch(() => null);
      if (response.ok) { lastError = null; break; }
      lastError = data;
      lastStatus = response.status;
      // The real reason is in Supabase → Edge Functions → ask-tutor → Logs.
      console.error(`Gemini API error (${model}, attempt ${attempt + 1}, HTTP ${response.status}):`, JSON.stringify(data));
      if (response.status === 429 || response.status >= 500 || response.status === 404) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue; // try again, on the next model
      }
      break;
    }

    // Free back-up AI: if Google's AI is out of quota or down, use Groq (free tier) for text questions.
    // Needs a GROQ_API_KEY secret (free from console.groq.com). Photos still need Google's AI.
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (lastError && groqKey && parts.length === 1) {
      const groqModels = [Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      for (const gm of groqModels) {
        try {
          const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: gm,
              messages: [{ role: 'system', content: SYSTEM_PROMPT + (allowDiagram && !asJson ? DIAGRAM_INSTRUCTIONS : '') }, { role: 'user', content: question }],
              max_tokens: 8000,
              ...(asJson ? { response_format: { type: 'json_object' } } : {}),
            }),
          });
          const gd = await gr.json().catch(() => null);
          const text = String(gd?.choices?.[0]?.message?.content || '').trim();
          if (gr.ok && text) return json({ answer: text });
          console.error(`Groq error (${gm}, HTTP ${gr.status}):`, JSON.stringify(gd));
        } catch (e) { console.error('Groq failed:', e); }
      }
    }

    if (lastError) {
      const why = String(lastError?.error?.message || '').slice(0, 160);
      if (lastStatus === 401 || lastStatus === 403 || /api key/i.test(why)) return json({ error: `The AI key was rejected (HTTP ${lastStatus}). The site owner needs to check GEMINI_API_KEY. ${why}` }, 500);
      if (lastStatus === 404) return json({ error: `The AI model couldn't be found (HTTP 404). The site owner needs to check the model name. ${why}` }, 500);
      if (lastStatus === 429) return json({ error: `The AI is busy: its daily or per-minute limit has been reached (HTTP 429). ${why}` }, 500);
      return json({ error: `The AI is having trouble right now (HTTP ${lastStatus}). ${why}` }, 500);
    }

    const candidate = data?.candidates?.[0];
    // Join every text part (skipping any "thinking" parts).
    const answer = (candidate?.content?.parts || [])
      .filter((p: any) => typeof p?.text === 'string' && !p.thought)
      .map((p: any) => p.text)
      .join('')
      .trim();

    if (!answer) {
      const blocked = data?.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY';
      return json({ answer: blocked
        ? "Sorry, I can't help with that one. Try asking about something else for school!"
        : "Sorry, I couldn't come up with an answer. Try rephrasing your question." });
    }
    if (candidate?.finishReason === 'MAX_TOKENS') console.warn('Answer hit the length limit and may be cut off.');

    return json({ answer });
  } catch (err) {
    console.error('Function error:', err);
    return json({ error: 'Something went wrong' }, 500);
  }
});

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { title, head, lines } = await req.json();
    const text = (Array.isArray(lines) ? lines : []).slice(0, 12).join('\n').slice(0, 2500);
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

    const system =
      'You are Bulzo, a friendly bull who teaches money to kids aged 10 to 15 in India. ' +
      'The student did not understand the text below. Explain it again in much simpler words. ' +
      'Use short sentences, no jargon (or explain the word right away), and one everyday example ' +
      '(pocket money, cricket, chai, school canteen, rupees). Be warm and never talk down. ' +
      'Return JSON only: {"lines":["...","..."]} with 3 to 5 short lines, each under 30 words.';

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: 'Lesson: ' + title + '\nTopic: ' + head + '\n\nText:\n' + text }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) return NextResponse.json({ error: 'AI failed ' + res.status }, { status: 502 });
    const out = await res.json();
    const raw = out?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const clean = (parsed.lines || []).map((l) => String(l).trim()).filter(Boolean).slice(0, 6);
    if (!clean.length) return NextResponse.json({ error: 'Empty' }, { status: 502 });
    return NextResponse.json({ lines: clean });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

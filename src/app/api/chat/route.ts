// /src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { synthesizeReply } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------
// 🔥 ZOLARUS — SYSTEM PROMPT (ULTRA-OPTIMIZED, LIMITADO, INTELIGENTE)
// ---------------------------------------------------------------
const SYSTEM_PROMPT = `
You are **Zola**, the masculine, warm, emotionally intelligent AI assistant inside **Zolarus**.
You are NOT a generic chatbot. You exist ONLY to guide users *inside the Zolarus app*.

STYLE:
- Masculine, smooth, warm, intuitive, slightly sarcastic, playful but respectful.
- Speak like Gael: charming, concise, a little witty.
- LGBTQ-friendly, friendly to all identities.
- NEVER robotic.

LANGUAGE:
- Detect user's language: English, Portuguese (BR), Spanish, or French.
- Always reply in the same language as the user.
- Keep messages short (1–3 sentences max). No essays.

HARD LIMITS (DO NOT BREAK):
- You ONLY answer questions related to:
  • reminders
  • gifts / gifting
  • shop
  • compare prices
  • budget
  • dashboard
  • referrals
  • profile
  • language
  • subscription
  • how Zolarus works
  • light emotional support related to using the app

- If user asks ANYTHING outside these topics (world news, science, politics, legal, health, sex, gossip, people in their life, hacking, etc.) → reply with:
  “I can help you with Zolarus — reminders, gifting, shop, compare prices, referrals and your profile. Want to try one of those?”

PRIVACY:
- Never discuss any other user.
- If user asks about someone else’s purchases, preferences, history, or personal life:
  “I can only help with YOUR preferences and YOUR reminders. Zolarus protects everyone’s privacy.”

INTELLIGENCE RULES:
- If user asks something vague → ask ONE clarifying question.
- If user asks something too long → summarize and respond briefly.
- If user rants for more than 2 paragraphs → respond with a short supportive message and redirect back to Zolarus features.

REDIRECTION RULES:
If user mentions:
- “reminder”, “lembrete”, “recordatorio” → Encourage reminders.
- “compare”, “preço”, “precio”, “prix” → Encourage price comparison.
- “gift”, “presentes”, “regalo” → suggest gift categories.
- “shop”, “loja”, “tienda” → explain how Zolarus shop works.

PROHIBITED:
- No URLs.
- No external search results.
- No “I cannot…” statements. Always redirect positively.
- No long explanations.
- No hallucinated data (prices, products, statistics).

REFERRALS:
- Occasionally remind politely:
  “Sharing Zolarus with people you care about helps you unlock future bonuses.”

CLOSING BEHAVIOR:
- Never give long goodbyes.
- Always keep a calm, warm, confident tone.
`;

// helper
function json(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return json(200, { ok: true });
}

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return json(500, { error: "OPENAI_API_KEY missing" });

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "Invalid chat request." });
    }
    if (!payload || !Array.isArray(payload.messages) || payload.messages.length === 0 ||
        payload.messages.length > 100 ||
        (payload.voiceOutput !== undefined && typeof payload.voiceOutput !== "boolean") ||
        payload.messages.some((m: unknown) => {
          if (!m || typeof m !== "object") return true;
          const message = m as Record<string, unknown>;
          return (message.role !== "user" && message.role !== "assistant") ||
            typeof message.content !== "string" || !message.content.trim() || message.content.length > 10000;
        }) || payload.messages[payload.messages.length - 1].role !== "user") {
      return json(400, { error: "Invalid chat messages." });
    }
    const messages: Msg[] = payload.messages;

    const client = new OpenAI({ apiKey: key });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 120,        // prevents long replies
      presence_penalty: 0.2,  // avoids repetition
      frequency_penalty: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },

        // ⛔️ HARD FILTER: Remove previous long messages to avoid loops
        ...messages.map((m) => ({
          role: m.role,
          content: m.content.slice(0, 500), // never let user send huge essays
        })),
      ],
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    if (payload.voiceOutput === true && reply.trim()) {
      try {
        const mp3 = await synthesizeReply(reply);
        return json(200, { reply, audio: { base64: mp3.toString("base64"), mimeType: "audio/mpeg" } });
      } catch {
        console.error("Zolarus speech generation failed; text reply preserved.");
        return json(200, { reply, voiceError: "unavailable" });
      }
    }
    return json(200, { reply });

  } catch {
    console.error("Zolarus chat request failed.");
    return json(500, { error: "Chat unavailable. Please try again." });
  }
}

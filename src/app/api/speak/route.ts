// /src/app/api/speak/route.ts
import { NextResponse } from "next/server";
import { synthesizeReply } from "@/lib/voice";
import { isGreeting } from "@/lib/greetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The widget sends the exact greeting it is already displaying, so the spoken
// line always matches the visible one. Greetings are one short sentence.
const MAX_TEXT_LENGTH = 300;

// Best-effort in-process rate limit: a fixed window per client IP, with no
// dependency, external store or env var. Vercel runs multiple instances and
// recycles them, so treat this as a cost guard against repeated calls rather
// than a hard global quota.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const MAX_TRACKED_IPS = 10_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Seconds to wait if the caller is over the limit, otherwise null. */
function retryAfter(ip: string): number | null {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now >= entry.resetAt) {
    // Drop expired buckets before growing, so the map cannot leak.
    if (hits.size >= MAX_TRACKED_IPS) {
      for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
      if (hits.size >= MAX_TRACKED_IPS) hits.clear();
    }
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const wait = retryAfter(clientIp(req));
    if (wait !== null) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(wait) } },
      );
    }
    const payload = await req.json().catch(() => null);
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text || text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "Invalid text." }, { status: 400 });
    }
    // Greetings are the only reason this endpoint exists, so nothing else is
    // synthesized. Keeps it from becoming a free text-to-speech proxy.
    if (!isGreeting(text)) {
      return NextResponse.json({ error: "Unsupported text." }, { status: 400 });
    }
    const mp3 = await synthesizeReply(text);
    return NextResponse.json({
      audio: { base64: mp3.toString("base64"), mimeType: "audio/mpeg" },
    });
  } catch {
    console.error("Zolarus greeting speech generation failed.");
    return NextResponse.json({ error: "Speech unavailable." }, { status: 500 });
  }
}

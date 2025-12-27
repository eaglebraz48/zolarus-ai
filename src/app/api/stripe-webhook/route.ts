// src/app/api/stripe-webhook/route.ts
import { NextResponse } from "next/server";

// Keep the endpoint alive so Netlify/Next doesn't error
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 
 * Stripe webhook fully disabled.
 * This remains only so Stripe or Next won't throw route-not-found errors.
 */
export async function POST() {
  return NextResponse.json({ disabled: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, disabled: true });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

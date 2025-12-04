import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  const redirectTo =
    requestUrl.searchParams.get("redirect") || "/dashboard";
  const lang =
    requestUrl.searchParams.get("lang") || "en";

  // Se tiver "code", troca pelo token de sessão
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Depois de logado → manda para o dashboard
  return NextResponse.redirect(`${redirectTo}?lang=${lang}`);
}

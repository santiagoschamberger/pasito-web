import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/catalogo-online/supabase/server";
import { safeReturnPath } from "@/lib/catalogo-online/domain";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(
    new URL("/beneficios/ingresar?error=callback", request.url),
  );
}

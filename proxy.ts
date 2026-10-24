import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  supabaseConfig,
  hasCatalogConfig,
} from "./lib/catalogo-online/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasCatalogConfig()) return response;
  const { url, key } = supabaseConfig();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/beneficios/:path*"],
};

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { supabaseConfig } from "./config";
export async function serverClient() {
  const jar = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        } catch {
          /* Server Components cannot set cookies; proxy refreshes them. */
        }
      },
    },
  });
}
export const getViewer = cache(async () => {
  const client = await serverClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name,pasitos_balance,country_code")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile: profileError ? null : profile };
});

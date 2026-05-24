export const APP_REDIRECT = "ar.pasito.pasito://login-callback";
const SUPABASE_URL = "https://trsbowwcigzayhdpfxvd.supabase.co";

export type SearchParams = Record<string, string | string[] | undefined>;

export type AuthParams = {
  token: string;
  type: string;
  redirectTo: string;
};

export function buildAuthParams(params: SearchParams): AuthParams | null {
  const confirmationUrl = parseUrl(stringParam(params.confirmation_url));
  const token =
    stringParam(params.token) ||
    stringParam(params.token_hash) ||
    confirmationUrl?.searchParams.get("token") ||
    confirmationUrl?.searchParams.get("token_hash") ||
    "";
  const type =
    stringParam(params.type) || confirmationUrl?.searchParams.get("type") || "";
  const redirectTo =
    stringParam(params.redirect_to) ||
    confirmationUrl?.searchParams.get("redirect_to") ||
    "";

  if (!token || !type || !redirectTo) return null;
  if (!isAllowedAuthType(type)) return null;
  if (!redirectTo.startsWith(APP_REDIRECT)) return null;

  return {
    token,
    type: authVerifyType(type),
    redirectTo,
  };
}

export function buildSupabaseVerifyUrl({
  token,
  type,
  redirectTo,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_URL,
}: {
  token: string;
  type: string;
  redirectTo: string;
  supabaseUrl?: string;
}) {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("type", authVerifyType(type));
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

export function authVerifyType(type: string) {
  return type === "email" ? "magiclink" : type;
}

export function isAllowedAuthType(type: string) {
  return type === "magiclink" || type === "email" || type === "signup";
}

function stringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseUrl(value: string) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

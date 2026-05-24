import { NextRequest } from "next/server";

import {
  APP_REDIRECT,
  authVerifyType,
  buildSupabaseVerifyUrl,
  isAllowedAuthType,
} from "../auth-confirm";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token =
    stringValue(form?.get("token")) || stringValue(form?.get("token_hash"));
  const type = authVerifyType(stringValue(form?.get("type")));
  const redirectTo = stringValue(form?.get("redirect_to"));

  if (
    !token ||
    !isAllowedAuthType(type) ||
    !redirectTo.startsWith(APP_REDIRECT)
  ) {
    return redirectToError(req, "invalid");
  }

  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Location: buildSupabaseVerifyUrl({ token, type, redirectTo }),
    },
  });
}

function redirectToError(req: NextRequest, error: "expired" | "invalid") {
  const url = new URL("/auth-confirm", req.url);
  url.searchParams.set("error", error);
  return Response.redirect(url, 303);
}

function stringValue(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

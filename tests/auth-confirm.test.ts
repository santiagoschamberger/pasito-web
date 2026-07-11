import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthParams,
  buildSupabaseVerifyUrl,
} from "../app/auth-confirm/auth-confirm.ts";

test("buildAuthParams salvages the PKCE token from a split ConfirmationURL", () => {
  const params = buildAuthParams({
    confirmation_url:
      "https://trsbowwcigzayhdpfxvd.supabase.co/auth/v1/verify?token=pkce_test_token",
    type: "magiclink",
    redirect_to: "ar.pasito.pasito://login-callback",
  });

  assert.deepEqual(params, {
    token: "pkce_test_token",
    type: "magiclink",
    redirectTo: "ar.pasito.pasito://login-callback",
  });
});

test("buildAuthParams normalizes legacy email type links", () => {
  const params = buildAuthParams({
    token: "pkce_test_token",
    type: "email",
    redirect_to: "ar.pasito.pasito://login-callback",
  });

  assert.equal(params?.type, "magiclink");
});

test("buildAuthParams accepts signup links for new users", () => {
  const params = buildAuthParams({
    token: "pkce_test_token",
    type: "signup",
    redirect_to: "ar.pasito.pasito://login-callback",
  });

  assert.equal(params?.type, "signup");
});

test("buildAuthParams rejects dashboard/web redirect targets", () => {
  const params = buildAuthParams({
    token: "pkce_test_token",
    type: "magiclink",
    redirect_to: "https://partners.pasito.app/auth/callback",
  });

  assert.equal(params, null);
});

test("buildSupabaseVerifyUrl sends the PKCE token through Supabase native verify", () => {
  const url = new URL(
    buildSupabaseVerifyUrl({
      token: "pkce_test_token",
      type: "email",
      redirectTo: "ar.pasito.pasito://login-callback",
      supabaseUrl: "https://trsbowwcigzayhdpfxvd.supabase.co",
    }),
  );

  assert.equal(url.origin, "https://trsbowwcigzayhdpfxvd.supabase.co");
  assert.equal(url.pathname, "/auth/v1/verify");
  assert.equal(url.searchParams.get("token"), "pkce_test_token");
  assert.equal(url.searchParams.get("type"), "magiclink");
  assert.equal(
    url.searchParams.get("redirect_to"),
    "ar.pasito.pasito://login-callback",
  );
});

test("buildSupabaseVerifyUrl preserves signup type for new users", () => {
  const url = new URL(
    buildSupabaseVerifyUrl({
      token: "pkce_test_token",
      type: "signup",
      redirectTo: "ar.pasito.pasito://login-callback",
      supabaseUrl: "https://trsbowwcigzayhdpfxvd.supabase.co",
    }),
  );

  assert.equal(url.searchParams.get("type"), "signup");
});

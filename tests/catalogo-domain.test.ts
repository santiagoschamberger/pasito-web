import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeReturnPath,
  safeStoreUrl,
  redemptionMessage,
} from "../lib/catalogo-online/domain.ts";
import { flagEnabled } from "../lib/catalogo-online/rollout.ts";
test("auth returns only to storefront destinations", () => {
  const product = "/beneficios/30000000-0000-4000-8000-000000000001";
  for (const path of [
    "/beneficios",
    "/beneficios/canjes",
    "/beneficios/pasitos",
    product,
  ])
    assert.equal(safeReturnPath(path), path);
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/beneficios/../ingresar",
    "/health",
    "/beneficios/auth/callback",
    "/beneficios/canjes?next=https://evil.example",
  ])
    assert.equal(safeReturnPath(path), "/beneficios");
});
test("merchant links reject script schemes and loopback outside the explicit test environment", () => {
  assert.equal(safeStoreUrl("javascript:alert(1)"), null);
  assert.equal(
    safeStoreUrl("https://shop.example/checkout"),
    "https://shop.example/checkout",
  );
  assert.equal(safeStoreUrl("http://127.0.0.1:55321/__test/shop/1"), null);
  assert.equal(
    safeStoreUrl("http://127.0.0.1:55321/__test/shop/1", true),
    "http://127.0.0.1:55321/__test/shop/1",
  );
});
test("redemption failures have actionable Spanish copy and never expose raw errors", () => {
  assert.match(
    redemptionMessage("Insufficient Pasitos balance"),
    /suficientes Pasitos/,
  );
  assert.match(redemptionMessage("External codes exhausted"), /sin stock/);
  assert.match(
    redemptionMessage("Redemption cooldown active"),
    /período de espera/,
  );
  assert.ok(!redemptionMessage("secret SQL stack trace").includes("SQL"));
});
test("redemption feature gate preserves the native rollout and allowlist rules", () => {
  const user = "10000000-0000-4000-8000-000000000001";
  assert.equal(flagEnabled(undefined, user), false);
  assert.equal(
    flagEnabled(
      { enabled: false, rollout_percentage: 100, user_allowlisted: true },
      user,
    ),
    false,
  );
  assert.equal(
    flagEnabled({ enabled: true, rollout_percentage: 0 }, user),
    false,
  );
  assert.equal(
    flagEnabled(
      { enabled: true, rollout_percentage: 0, user_allowlisted: true },
      user,
    ),
    true,
  );
  assert.equal(
    flagEnabled({ enabled: true, rollout_percentage: 100 }, user),
    true,
  );
});

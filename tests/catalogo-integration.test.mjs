import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import postcss from "postcss";
const require = createRequire(import.meta.url);
const {
  unstable_doesMiddlewareMatch,
} = require("next/experimental/testing/server");

test("catalog authentication never intercepts marketing, payments or mobile deep links", () => {
  const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  const matcher = JSON.parse(source.match(/matcher:\s*(\[[^\]]+\])/)[1]);
  const matches = (url) =>
    unstable_doesMiddlewareMatch({ config: { matcher }, nextConfig: {}, url });
  for (const path of [
    "/beneficios",
    "/beneficios/ingresar",
    "/beneficios/auth/callback",
    "/beneficios/canjes",
    "/beneficios/pasitos",
  ])
    assert.equal(matches(path), true, path);
  for (const path of [
    "/",
    "/comercios",
    "/gestion",
    "/api/dlocalgo/webhook",
    "/g/invite",
    "/i/ABC",
    "/r/reservation",
    "/auth-confirm",
    "/challenges/123",
    "/.well-known/apple-app-site-association",
  ])
    assert.equal(matches(path), false, path);
});
test("catalog CSS cannot change elements outside its route wrapper", () => {
  const css = postcss.parse(
    readFileSync(
      new URL("../app/beneficios/catalogo.css", import.meta.url),
      "utf8",
    ),
  );
  css.walkRules((rule) => {
    let parent = rule.parent;
    while (parent) {
      if (parent.type === "atrule" && parent.name.endsWith("keyframes")) return;
      parent = parent.parent;
    }
    for (const selector of rule.selectors)
      assert.ok(
        selector.startsWith(".online-storefront") ||
          selector.startsWith(":where(.online-storefront)"),
        selector,
      );
  });
});

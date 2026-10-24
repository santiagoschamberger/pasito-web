export type StoreReward = {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  pasitos_cost: number;
  category: string;
  image_url: string | null;
  kind: string;
  redemption_mode: string;
  remaining_stock: number | null;
  external_code_available_count: number;
  daily_remaining?: number | null;
  stock_paused_until?: string | null;
  conditions: string | null;
  redemption_url: string | null;
  redemption_instructions: string | null;
  online_catalog_eligible: boolean;
  partner: {
    name: string;
    logo_url: string | null;
    fulfillment_type: string;
    online_store_url?: string | null;
    online_store_label?: string | null;
    online_redemption_instructions?: string | null;
  };
};
export type Coupon = {
  id: string;
  pasitos_spent: number;
  used_at: string;
  external_redemption_code: string | null;
  reward: {
    title: string;
    kind: string;
    redemption_url: string | null;
    redemption_instructions: string | null;
  };
  partner: { name: string; logo_url: string | null };
};
export const number = (value: number) =>
  new Intl.NumberFormat("es-AR").format(value);
export const categoryName = (value: string) =>
  ({
    cafe: "Café y delicias",
    deportes: "Deportes",
    hogar: "Hogar",
    belleza: "Belleza",
    moda: "Moda",
    bienestar: "Bienestar",
  })[value] ?? (value ? value[0].toUpperCase() + value.slice(1) : "Otros");
export function safeReturnPath(value: string | null | undefined): string {
  return value === "/beneficios/pasitos" ||
    value === "/beneficios/canjes" ||
    value === "/beneficios" ||
    /^\/beneficios\/[0-9a-f-]{36}$/i.test(value ?? "")
    ? value!
    : "/beneficios";
}
export function safeStoreUrl(
  value: string | null,
  allowLocal = false,
): string | null {
  try {
    const url = new URL(value ?? "");
    if (url.protocol === "https:") return url.href;
    if (
      allowLocal &&
      url.protocol === "http:" &&
      url.hostname === "127.0.0.1" &&
      url.port === "55321" &&
      url.pathname.startsWith("/__test/shop/")
    )
      return url.href;
  } catch {
    /* An absent or invalid merchant link has no action. */
  }
  return null;
}
export function redemptionMessage(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("insufficient") || message.includes("saldo"))
    return "Todavía no tenés suficientes Pasitos para este beneficio.";
  if (
    message.includes("cooldown") ||
    message.includes("daily redemption limit")
  )
    return "Ya canjeaste en esta tienda. Podés volver a hacerlo cuando termine el período de espera.";
  if (/exhausted|out of stock|daily reward limit/.test(message))
    return "Este beneficio se quedó sin stock. Tus Pasitos no se descontaron.";
  if (/expired|inactive|not available/.test(message))
    return "Este beneficio ya no está disponible. Elegí otro de la tienda.";
  return "No pudimos confirmar el canje. Reintentá: la misma solicitud no se cobra dos veces.";
}

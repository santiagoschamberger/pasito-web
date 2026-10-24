import "server-only";
import { cache } from "react";
import { serverClient } from "./supabase/server";
import type { Coupon, StoreReward } from "./domain";
export const getCatalog = cache(
  async (country = "AR"): Promise<StoreReward[]> => {
    const client = await serverClient();
    const { data, error } = await client.rpc("get_online_store_catalog", {
      p_country_code: country,
    });
    if (error) throw new Error("No pudimos cargar las tiendas online.");
    return (data ?? []).filter(
      (r: StoreReward) => r.kind === "web" && r.online_catalog_eligible,
    );
  },
);
export async function getCoupons(userId: string): Promise<Coupon[]> {
  const client = await serverClient();
  const { data, error } = await client
    .from("coupons")
    .select(
      "id,pasitos_spent,used_at,external_redemption_code,reward:rewards!inner(title,kind,redemption_url,redemption_instructions),partner:partners(name,logo_url)",
    )
    .eq("user_id", userId)
    .eq("status", "used")
    .eq("hidden_in_history", false)
    .eq("reward.kind", "web")
    .order("used_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("No pudimos cargar tus canjes.");
  return ((data as unknown as Coupon[]) ?? []).filter(
    (c) => c.reward?.kind === "web",
  );
}

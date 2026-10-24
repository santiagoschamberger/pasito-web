"use server";
import { serverClient } from "@/lib/catalogo-online/supabase/server";
import { flagEnabled } from "@/lib/catalogo-online/rollout";
import { redemptionMessage } from "@/lib/catalogo-online/domain";

export async function redeemReward(
  rewardId: string,
  idempotencyKey: string,
): Promise<{ couponId?: string; error?: string }> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rewardId,
    ) ||
    !/^[0-9a-f-]{36}$/i.test(idempotencyKey)
  )
    return { error: "Solicitud de canje inválida." };
  const client = await serverClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return { error: "Ingresá a tu cuenta para canjear." };
  const [detail, flags] = await Promise.all([
    client.rpc("get_reward_detail_with_availability", {
      p_reward_id: rewardId,
    }),
    client.rpc("get_feature_flags_for_current_user"),
  ]);
  if (
    detail.error ||
    !detail.data ||
    detail.data.kind !== "web" ||
    detail.data.redemption_mode !== "external_code"
  )
    return { error: "Este beneficio no está disponible para canjear online." };
  const flag = flags.data?.find(
    (f: { flag_key: string }) => f.flag_key === "external_code_rewards_enabled",
  );
  if (flags.error || !flagEnabled(flag, user.id))
    return {
      error:
        "Los canjes online no están habilitados para tu cuenta en este momento.",
    };
  // The existing Edge Function owns authorization and the transaction. No
  // service key, local balance math or coupon assignment belongs in this app.
  const { data, error } = await client.functions.invoke(
    "redeem-external-code",
    {
      body: { reward_id: rewardId, idempotency_key: idempotencyKey },
    },
  );
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const body = await error.context.json();
        message = body.error ?? message;
      } catch {
        /* Transport error has no body. */
      }
    }
    return { error: redemptionMessage(message) };
  }
  return data?.coupon_id
    ? { couponId: data.coupon_id }
    : { error: redemptionMessage("") };
}

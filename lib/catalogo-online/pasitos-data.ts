import "server-only";
import { serverClient } from "./supabase/server";
import {
  composeMovements,
  dayKey,
  expiryLabel,
  type ActivitySnapshot,
  type Credit,
} from "./pasitos";

export async function getPasitosDetail(userId: string, days: number) {
  const client = await serverClient();
  const [snapshot, referrals, boosts, olderActivity] = await Promise.all([
    client.rpc("get_my_activity_snapshot_v2"),
    client.rpc("get_my_referral_bonus_credits", { p_limit: 50 }),
    client.rpc("get_my_step_boost_credits", { p_limit: 50 }),
    days > 30
      ? client
          .from("daily_activity")
          .select("date,raw_steps,validated_steps,pasitos_earned")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(days)
      : Promise.resolve(null),
  ]);
  if (
    snapshot.error ||
    !snapshot.data ||
    referrals.error ||
    boosts.error ||
    olderActivity?.error
  ) {
    throw new Error("No pudimos cargar tus movimientos.");
  }
  const data = snapshot.data as ActivitySnapshot;
  if (olderActivity) data.activity_history = olderActivity.data ?? [];
  const today = dayKey(new Date());
  return {
    ...composeMovements(
      data,
      (referrals.data ?? []) as Credit[],
      (boosts.data ?? []) as Credit[],
      today,
      days,
    ),
    today,
    expiry: expiryLabel(data.expiring_pasitos, today),
  };
}

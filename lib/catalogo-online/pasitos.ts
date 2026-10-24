// Same movement sources and amounts as the mobile Pasitos screen.
export type ActivityDay = {
  date: string;
  raw_steps: number;
  validated_steps: number;
  pasitos_earned: number;
};
export type Redemption = {
  id: string;
  pasitos_spent: number;
  used_at: string;
  instagram_shared_at: string | null;
  reward: { title: string } | null;
  partner: { name: string } | null;
};
export type Credit = {
  id: string;
  amount: number;
  credited_at: string;
  role?: string;
  movement_label?: string;
  eligible_steps?: number;
  duration_minutes?: number;
};
export type Expiry = { expiry_date: string; total_amount: number };
export type ActivitySnapshot = {
  activity_history: ActivityDay[];
  redemption_history: Redemption[];
  expiring_pasitos: Expiry[];
};
export type Movement = {
  id: string;
  day: string;
  occurredAt: string;
  amount: number;
  title: string;
  detail: string;
};
export const pasitosTimeZone = "America/Argentina/Buenos_Aires";
const number = (n: number) => new Intl.NumberFormat("es-AR").format(n);
export function dayKey(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: pasitosTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function visibleDays(value: string | undefined): number {
  const days = Number(value);
  return Number.isInteger(days) && days >= 30 ? Math.min(days, 360) : 30;
}
export function composeMovements(
  snapshot: ActivitySnapshot,
  referrals: Credit[],
  boosts: Credit[],
  today: string,
  days: number,
) {
  const movements: Movement[] = [];
  for (const day of snapshot.activity_history) {
    if (day.pasitos_earned > 0)
      movements.push({
        id: `walking-${day.date}`,
        day: day.date,
        occurredAt: `${day.date}T00:00:00-03:00`,
        amount: day.pasitos_earned,
        title: `Hiciste ${number(Math.max(day.raw_steps, day.validated_steps))} pasos`,
        detail: "Actividad diaria · Pasitos por caminar",
      });
  }
  for (const r of snapshot.redemption_history) {
    if (r.used_at && r.pasitos_spent > 0)
      movements.push({
        id: `redemption-${r.id}`,
        day: dayKey(r.used_at),
        occurredAt: r.used_at,
        amount: -r.pasitos_spent,
        title: `Canjeaste en ${r.partner?.name ?? "un comercio"}`,
        detail: r.reward?.title ?? "Canje",
      });
    if (r.instagram_shared_at)
      movements.push({
        id: `share-${r.id}`,
        day: dayKey(r.instagram_shared_at),
        occurredAt: r.instagram_shared_at,
        amount: 5,
        title: "Compartiste la foto de tu canje",
        detail: "Historia de Instagram",
      });
  }
  for (const c of referrals) {
    if (c.amount > 0)
      movements.push({
        id: `referral-${c.id}`,
        day: dayKey(c.credited_at),
        occurredAt: c.credited_at,
        amount: c.amount,
        title:
          c.role === "referred"
            ? "Te sumaste con un código de invitación"
            : "Invitaste a un amigo",
        detail: "Programa de referidos",
      });
  }
  for (const c of boosts) {
    if (c.amount > 0)
      movements.push({
        id: `boost-${c.id}`,
        day: dayKey(c.credited_at),
        occurredAt: c.credited_at,
        amount: c.amount,
        title: c.movement_label ?? "PASITO x partner",
        detail: `Boost · ${number(c.eligible_steps ?? 0)} pasos`,
      });
  }
  const start = shiftDay(today, 1 - days);
  return {
    movements: movements
      .filter((m) => m.day >= start && m.day <= today)
      .sort(
        (a, b) =>
          Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
          a.id.localeCompare(b.id),
      ),
    earnedToday:
      snapshot.activity_history.find((d) => d.date === today)?.pasitos_earned ??
      0,
    canLoadMore:
      days < 360 &&
      (snapshot.activity_history.length >= days ||
        movements.some((m) => m.day < start)),
  };
}
export function expiryLabel(batches: Expiry[], today: string): string | null {
  const next = batches
    .filter((b) => b.total_amount > 0 && b.expiry_date >= today)
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];
  if (!next) return null;
  const when =
    next.expiry_date === today
      ? "hoy"
      : next.expiry_date === shiftDay(today, 1)
        ? "mañana"
        : `el ${next.expiry_date.slice(8, 10)}/${next.expiry_date.slice(5, 7)}`;
  return `${number(next.total_amount)} ${next.total_amount === 1 ? "pasito vence" : "pasitos vencen"} ${when}`;
}
export function dayLabel(day: string, today: string) {
  if (day === today) return "Hoy";
  if (day === shiftDay(today, -1)) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: pasitosTimeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T12:00:00Z`));
}

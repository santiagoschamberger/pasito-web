import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeMovements,
  dayKey,
  expiryLabel,
  visibleDays,
  type ActivitySnapshot,
} from "../lib/catalogo-online/pasitos.ts";
const snapshot: ActivitySnapshot = {
  activity_history: [
    {
      date: "2026-10-23",
      raw_steps: 12500,
      validated_steps: 10000,
      pasitos_earned: 100,
    },
    {
      date: "2026-09-01",
      raw_steps: 100,
      validated_steps: 100,
      pasitos_earned: 1,
    },
  ],
  redemption_history: [
    {
      id: "1",
      used_at: "2026-10-23T04:00:00Z",
      pasitos_spent: 600,
      instagram_shared_at: "2026-10-23T05:00:00Z",
      partner: { name: "Nómada" },
      reward: { title: "Descuento" },
    },
  ],
  expiring_pasitos: [],
};
test("movements preserve credits, redemptions and share bonuses without deriving the balance", () => {
  const result = composeMovements(
    snapshot,
    [
      {
        id: "r",
        amount: 5,
        credited_at: "2026-10-23T06:00:00Z",
        role: "referred",
      },
    ],
    [
      {
        id: "b",
        amount: 15,
        credited_at: "2026-10-23T07:00:00Z",
        movement_label: "Doble Pasito",
      },
    ],
    "2026-10-23",
    30,
  );
  assert.deepEqual(
    result.movements.map((m) => m.amount),
    [15, 5, 5, -600, 100],
  );
  assert.match(result.movements.at(-1)!.title, /12.500 pasos/);
  assert.equal(result.earnedToday, 100);
  assert.equal(result.canLoadMore, true);
  assert.match(result.movements[1].title, /Te sumaste/);
});
test("calendar days respect Argentina midnight, window boundaries and future exclusions", () => {
  assert.equal(dayKey("2026-10-23T01:00:00Z"), "2026-10-22");
  assert.equal(dayKey("2026-10-23"), "2026-10-23");
  const result = composeMovements(
    snapshot,
    [{ id: "future", amount: 5, credited_at: "2026-10-24T12:00:00Z" }],
    [],
    "2026-10-23",
    30,
  );
  assert.equal(result.movements.length, 3);
  assert.equal(
    composeMovements(snapshot, [], [], "2026-10-23", 60).movements.length,
    4,
  );
});
test("empty history stays empty and pagination input stays bounded", () => {
  assert.deepEqual(
    composeMovements(
      { activity_history: [], redemption_history: [], expiring_pasitos: [] },
      [],
      [],
      "2026-10-23",
      30,
    ),
    { movements: [], earnedToday: 0, canLoadMore: false },
  );
  for (const input of [undefined, "oops", "-30", "Infinity"])
    assert.equal(visibleDays(input), 30);
  assert.equal(visibleDays("60"), 60);
  assert.equal(visibleDays("999999"), 360);
});
test("expiry ignores spent and expired batches and picks the soonest remaining batch", () => {
  assert.equal(
    expiryLabel(
      [
        { expiry_date: "2026-10-22", total_amount: 99 },
        { expiry_date: "2026-10-23", total_amount: 0 },
        { expiry_date: "2026-11-01", total_amount: 50 },
        { expiry_date: "2026-10-24", total_amount: 1 },
      ],
      "2026-10-23",
    ),
    "1 pasito vence mañana",
  );
  assert.equal(expiryLabel([], "2026-10-23"), null);
});

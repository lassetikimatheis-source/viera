import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  readState,
  totals,
  metricValue,
  shiftDate,
} from "../src/lib/vyra-data.ts";

test("Portions scale calories and all macros without rounding the stored values", () => {
  const result = totals([
    { kcal: 370, protein: 13, carbs: 59, fat: 7, grams: 60 },
  ]);
  assert.equal(result.kcal, 222);
  assert.equal(result.protein, 7.8);
  assert.equal(result.carbs, 35.4);
  assert.equal(result.fat, 4.2);
});
test("Missing measurements remain missing; heart rate is averaged and latest weight wins", () => {
  const date = "2026-10-14";
  assert.equal(metricValue([], "steps", date), null);
  assert.equal(
    metricValue(
      [
        { metric: "heart", date, value: 50 },
        { metric: "heart", date, value: 70 },
      ],
      "heart",
      date,
    ),
    60,
  );
  assert.equal(
    metricValue(
      [
        { metric: "weight", date, value: 80 },
        { metric: "weight", date, value: 75 },
      ],
      "weight",
      date,
    ),
    75,
  );
});
test("Date navigation works across month and year boundaries", () => {
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
});
test("Local backups roundtrip and invalid nested values are rejected", () => {
  const state = initialState();
  assert.deepEqual(
    readState(JSON.stringify(state)),
    JSON.parse(JSON.stringify(state)),
  );
  assert.throws(() => readState("{}"));
  assert.throws(() =>
    readState(
      JSON.stringify({ ...state, goals: { ...state.goals, kcal: -1 } }),
    ),
  );
  assert.throws(() => readState(JSON.stringify({ ...state, samples: [null] })));
  assert.throws(() =>
    readState(
      JSON.stringify({
        ...state,
        profile: { ...state.profile, avatar: "https://example.com/tracker" },
      }),
    ),
  );
});

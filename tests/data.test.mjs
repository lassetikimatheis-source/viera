import test from "node:test";
import assert from "node:assert/strict";
import { stressEvidence } from "../src/lib/stress-data.ts";
import {
  initialState,
  readState,
  totals,
  metricValue,
  shiftDate,
} from "../src/lib/vyra-data.ts";

test("Physiology preserves HRV methods, sources, time and excludes future readings", () => {
  const state = initialState(false);
  const at = new Date("2026-10-16T12:00:00").getTime();
  state.physiology = [
    { id: "a", source: "Watch", kind: "hrv-sdnn", at, value: 35 },
    { id: "b", source: "Watch", kind: "hrv-rmssd", at, value: 40 },
    { id: "c", source: "Other", kind: "hrv-sdnn", at, value: 55 },
    { id: "future", source: "Watch", kind: "pulse", at: at + 10000, value: 80 },
  ];
  state.samples = [{ id: "workout", metric: "workout", date: "2026-10-16", value: 10,
    source: "Watch", startedAt: at - 1000, endedAt: at + 1000 }];
  const result = stressEvidence(state, "2026-10-16", at);
  assert.equal(result.series.length, 3);
  assert.equal(result.today.length, 3);
  assert.equal(result.inWorkout(result.today[0]), true);
  assert.equal(result.score, undefined);
  assert.deepEqual(readState(JSON.stringify(state)).physiology, state.physiology);
  for (const value of [-1, 0, 1001, null]) {
    assert.throws(() => readState(JSON.stringify({ ...state, physiology: [{ ...state.physiology[0], value }] })));
  }
  state.permissions.heart = false;
  assert.equal(stressEvidence(state, "2026-10-16", at).today.length, 0);
});

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

test("Dashboard extensions validate backups without breaking existing saves", () => {
  const state = initialState(false);
  state.training = {
    id: "session",
    title: "Laufen",
    startedAt: Date.now() - 1000,
    pausedMs: 0,
  };
  state.stress = { "2026-10-16": 7 };
  state.sleepGoal = 8;
  state.trainingGoal = 60;
  assert.equal(readState(JSON.stringify(state)).training.title, "Laufen");
  assert.throws(() =>
    readState(JSON.stringify({ ...state, stress: { "2026-10-16": 11 } })),
  );
  assert.throws(() => readState(JSON.stringify({ ...state, sleepGoal: 0 })));
  assert.throws(() =>
    readState(
      JSON.stringify({
        ...state,
        training: { ...state.training, pausedMs: -1 },
      }),
    ),
  );
  state.samples = [
    {
      id: "sleep",
      metric: "sleep",
      date: "2026-10-16",
      value: 1,
      source: "Import",
      stages: [{ phase: "rem", start: 100, end: 200 }],
    },
  ];
  assert.equal(
    readState(JSON.stringify(state)).samples[0].stages[0].phase,
    "rem",
  );
  state.samples[0].stages[0].end = 50;
  assert.throws(() => readState(JSON.stringify(state)));
});

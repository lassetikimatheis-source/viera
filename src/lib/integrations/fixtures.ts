import { normalizeProvider } from "./data.ts";
import type { Provider } from "./config.ts";
export function previewBatch(provider: Provider) {
  const date = new Date().toISOString().slice(0, 10);
  const result = normalizeProvider(provider, provider === "whoop" ? {
    sleeps: [{ id: "test-sleep", end: `${date}T06:00:00Z`, timezone_offset: "+02:00", score_state: "SCORED", score: { stage_summary: {
      total_light_sleep_time_milli: 4 * 3600000, total_slow_wave_sleep_time_milli: 1.5 * 3600000, total_rem_sleep_time_milli: 2 * 3600000,
    } } }],
    recoveries: [{ cycle_id: "test-cycle", sleep_id: "test-sleep", score_state: "SCORED", score: { user_calibrating: false, resting_heart_rate: 57, hrv_rmssd_milli: 48 } }],
    workouts: [{ id: "test-workout", start: `${date}T07:00:00Z`, end: `${date}T07:40:00Z`, timezone_offset: "+02:00", sport_name: "Laufen" }],
  } : { workouts: [{ id: 12345, name: "Testlauf im Park", start_date: `${date}T07:00:00Z`, start_date_local: `${date}T09:00:00`, moving_time: 2400, elapsed_time: 2400, distance: 5200 }] }, date, date);
  return { ...result, samples: result.samples.map(r => ({ ...r, id: `test:${r.id}`, source: `Test · ${r.source}` })),
    physiology: result.physiology.map(r => ({ ...r, id: `test:${r.id}`, source: `Test · ${r.source}` })) };
}

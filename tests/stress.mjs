import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || "http://localhost:3021");
  await page.getByRole("button", { name: /Körperlicher Stress/ }).click();
  await page.getByText(/Noch kein berechneter Stresswert/).waitFor();
  await page.getByRole("button", { name: "Health-Daten importieren" }).click();
  const date = new Date().toLocaleDateString("en-CA");
  const record = (type, value, unit) => `<Record type="HKQuantityTypeIdentifier${type}" value="${value}" unit="${unit}" sourceName="Test Watch" startDate="${date} 00:01:00 +0200"/>`;
  const xml = `<HealthData>${record("HeartRate", 65, "count/min")}${record("HeartRateVariabilitySDNN", 0.042, "s")}${record("HeartRateVariabilityRMSSD", 50, "ms")}${record("HeartRateVariabilitySDNN", -4, "ms")}</HealthData>`;
  for (let i = 0; i < 2; i++) {
    await page.locator('input[type="file"]').setInputFiles({ name: "export.xml", mimeType: "text/xml", buffer: Buffer.from(xml) });
    await page.getByRole("button", { name: "Ausgewählte Daten importieren" }).click();
  }
  const readings = await page.evaluate(() => JSON.parse(localStorage.getItem("vyra-personal-v2")).physiology);
  assert.equal(readings.length, 3);
  assert.equal(readings.find((r) => r.kind === "hrv-sdnn").value, 42);
  await page.getByRole("navigation").getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /Körperlicher Stress/ }).click();
  await page.getByRole("heading", { name: "HRV · SDNN" }).waitFor();
  await page.getByRole("heading", { name: "HRV · RMSSD" }).waitFor();
  assert.equal(await page.locator(".stress-readings meter").count(), 2);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => localStorage.setItem("vyra-theme", theme), theme);
    await page.reload();
    await page.getByRole("button", { name: /Körperlicher Stress/ }).click();
    await page.screenshot({ path: `/tmp/vyra-stress-${theme}.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.reload();
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem("vyra-personal-v2")).physiology)).length, 3);
  assert.deepEqual(errors, []);
  console.log("PASS: empty state, sensor-only import, units, invalid values, deduplication, HRV method separation, persistence and mobile layout");
} finally { await browser.close(); }

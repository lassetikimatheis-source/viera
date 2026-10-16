import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const out = process.env.SCREENSHOT_DIR || "/tmp/vyra-performance";
await mkdir(out, { recursive: true });
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("vyra-personal-v2")));
const home = () =>
  page
    .getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
try {
  await page.goto(process.env.BASE_URL || "http://localhost:3021");
  await page
    .getByRole("button", { name: "Schlaf im Detail", exact: true })
    .waitFor();
  assert.deepEqual(
    await page.locator(".performance-rings b").allTextContents(),
    ["Schlaf", "Gesundheit", "Belastung"],
  );
  await page.screenshot({ path: `${out}/dashboard-dark.png` });
  await page
    .getByRole("button", { name: "Schlaf im Detail", exact: true })
    .click();
  await page.getByText(/Illustrative Demo-Phasen/).waitFor();
  await page.locator(".sleep-lane button").first().click();
  await page.screenshot({ path: `${out}/sleep-dark.png` });
  await page.getByLabel("Persönliches Schlafziel (Stunden)").fill("9");
  assert.equal((await saved()).sleepGoal, 9);
  await home();
  await page
    .getByRole("button", { name: "Gesundheitsbalance im Detail", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "So setzt sich die Balance zusammen" })
    .waitFor();
  assert.equal(await page.locator(".balance-part").count(), 3);
  await page.screenshot({ path: `${out}/balance-dark.png` });
  await home();
  await page.getByRole("button", { name: /Dein Stresslevel/ }).click();
  await page
    .getByRole("slider", { name: "Stresslevel", exact: true })
    .fill("7");
  await page.getByRole("button", { name: "Selbstcheck speichern" }).click();
  assert(Object.values((await saved()).stress).includes(7));
  await page.getByRole("button", { name: "Vorheriger Tag" }).click();
  assert(
    await page
      .getByRole("button", { name: /Dein Stresslevel.*Eintragen/ })
      .count(),
  );
  await page.getByRole("button", { name: /Training starten.*Manuell/ }).click();
  await page.getByLabel("Trainingsart").selectOption("Laufen");
  await page
    .getByRole("button", { name: "Training starten", exact: true })
    .click();
  assert((await saved()).training);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("vyra-personal-v2"));
    state.training.startedAt = Date.now() - 125000;
    localStorage.setItem("vyra-personal-v2", JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole("timer").waitFor();
  assert((await page.getByRole("timer").innerText()).startsWith("00:02:"));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  assert((await saved()).training.pausedAt);
  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen", exact: true }).waitFor();
  await page.getByRole("button", { name: "Fortsetzen", exact: true }).click();
  assert.equal((await saved()).training.pausedAt, undefined);
  await page.screenshot({ path: `${out}/training-dark.png` });
  await home();
  assert(await page.locator(".active-training-banner").count());
  await page.reload();
  await page.getByRole("timer").waitFor();
  await page.getByRole("button", { name: "Beenden", exact: true }).click();
  await page.getByRole("slider", { name: "Empfundene Anstrengung" }).fill("6");
  await page.getByRole("button", { name: "Training speichern" }).click();
  const state = await saved();
  assert.equal(state.training, null);
  const record = state.samples.find(
    (s) => s.title === "Laufen" && s.source === "Manuell",
  );
  assert(record.value >= 2 && record.value < 3);
  assert.equal(record.effort, 6);
  await page.getByRole("button", { name: /Laufen.*Manuell/ }).click();
  await page.getByText(/Anstrengung: 6\/10/).waitFor();
  await page.screenshot({ path: `${out}/strain-dark.png` });
  await home();
  await page
    .getByRole("button", { name: "Belastung im Detail", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Trainings importieren", exact: true })
    .click();
  const date = new Date().toLocaleDateString("en-CA");
  const xml = `<HealthData><Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Test Watch" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="${date} 01:00:00 +0200" endDate="${date} 03:00:00 +0200"/><Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Test Watch" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="${date} 02:00:00 +0200" endDate="${date} 04:00:00 +0200"/></HealthData>`;
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "export.xml",
      mimeType: "text/xml",
      buffer: Buffer.from(xml),
    });
  await page
    .getByRole("button", { name: "Ausgewählte Daten importieren" })
    .click();
  assert.equal(
    (await saved()).samples.find((s) => s.metric === "sleep").stages.length,
    2,
  );
  await home();
  await page
    .getByRole("button", { name: "Schlaf im Detail", exact: true })
    .click();
  await page.getByText(/Phasen aus deinem Health-Import/).waitFor();
  assert.equal(await page.locator(".sleep-lane button").count(), 3);
  assert.deepEqual(await page.locator(".phase-totals b").allTextContents(), [
    "60 Min.",
    "60 Min.",
    "60 Min.",
  ]);
  await page.reload();
  await page.getByText(/Phasen aus deinem Health-Import/).waitFor();
  await home();
  assert.equal(await page.locator(".balance-ring strong").innerText(), "–");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("vyra-personal-v2"));
    s.samples.forEach((p) => delete p.stages);
    localStorage.setItem("vyra-personal-v2", JSON.stringify(s));
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Schlaf im Detail", exact: true })
    .click();
  await page.getByText(/Es liegt nur die Schlafdauer vor/).waitFor();
  assert.equal(await page.locator(".sleep-lane").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: three ring links, adjustable sleep goal, beta balance, stress by day, training start/pause/resume/reload/save/history, imported sleep phases with overlaps, persistence and missing-data states.",
  );
} finally {
  await browser.close();
}

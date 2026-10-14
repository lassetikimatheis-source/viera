import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3021";
const out = process.env.SCREENSHOT_DIR || "/tmp/vyra-checks";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
const clickTab = async (label) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name: label, exact: true })
    .click();
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("vyra-personal-v2")));
try {
  await page.goto(base);
  await page.getByRole("navigation").waitFor();
  assert.equal(await page.getByRole("button", { name: /Coach/ }).count(), 0);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [tab, key] of [
      ["Home", "home"],
      ["Health", "health"],
      ["Ernährung", "nutrition"],
      ["Gesundheit", "wellbeing"],
      ["Profil", "profile"],
    ]) {
      await clickTab(tab);
      await page.screenshot({ path: `${out}/${key}-${viewport.width}.png` });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `page overflow ${key}`,
      );
      assert.equal(
        await page
          .locator(".app-scroll")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
        false,
        `content overflow ${key}`,
      );
      const nav = await page.locator(".bottom-nav").boundingBox();
      assert(nav.y + nav.height <= viewport.height + 1);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await clickTab("Ernährung");
  await page
    .getByRole("button", { name: "Frühstück hinzufügen", exact: true })
    .click();
  await page.getByLabel("Lebensmittel suchen").fill("Banane");
  await page.getByRole("button", { name: /Banane.*100 g/ }).click();
  await page.getByLabel("Portion in g").fill("150");
  await page.getByRole("button", { name: "Zum Tagebuch hinzufügen" }).click();
  assert(
    (await saved()).entries.some((e) => e.name === "Banane" && e.grams === 150),
  );
  await page.reload();
  await page.getByRole("navigation").waitFor();
  await page.getByRole("button", { name: /Banane.*150 g/ }).click();
  await page.getByLabel("Portion in g").fill("200");
  await page.getByRole("button", { name: "Änderung speichern" }).click();
  assert(
    (await saved()).entries.some((e) => e.name === "Banane" && e.grams === 200),
  );
  await page.getByRole("button", { name: /Banane.*200 g/ }).click();
  await page
    .getByRole("button", { name: "Eintrag löschen", exact: true })
    .click();
  assert(
    !(await saved()).entries.some(
      (e) => e.name === "Banane" && e.grams === 200,
    ),
  );
  await page.getByRole("button", { name: "250 ml Wasser hinzufügen" }).click();
  await page.getByRole("button", { name: "Supplement anlegen" }).click();
  await page.getByLabel("Präparat").fill("Test-Präparat");
  await page.getByLabel("Menge", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await page
    .getByRole("button", { name: "Test-Präparat als genommen markieren" })
    .click();
  assert.equal((await saved()).supplements[0].dates.length, 1);
  await page.getByRole("button", { name: "Vorheriger Tag" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Test-Präparat als genommen markieren" })
      .getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "Nächster Tag" }).click();
  await clickTab("Gesundheit");
  await page.getByRole("switch", { name: /Zyklus-Tracking/ }).check();
  await page.getByRole("button", { name: /Mein Zyklus/ }).click();
  await page.getByRole("button", { name: "Tag eintragen" }).click();
  await page.getByLabel("Blutung").selectOption("Leicht");
  await page.getByLabel("Symptome").fill("Test");
  await page.getByRole("button", { name: "Eintrag speichern" }).click();
  assert.equal((await saved()).cycle.entries.length, 1);
  await clickTab("Health");
  await page.getByRole("button", { name: /Schritte.*Schritte/ }).click();
  await page.getByRole("button", { name: "Wert eintragen" }).click();
  await page.getByLabel("Wert (Schritte)").fill("100");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  assert(
    (await saved()).samples.some(
      (s) => s.source === "Manuell" && s.value === 100,
    ),
  );
  await page.getByRole("button", { name: "Monat", exact: true }).click();
  await page.screenshot({ path: `${out}/health-detail.png` });
  await clickTab("Profil");
  await page.getByRole("button", { name: /Ziele & Einstellungen/ }).click();
  await page.getByLabel("Kalorien (kcal)").fill("2300");
  await page.getByRole("button", { name: "Ziele speichern" }).click();
  assert.equal((await saved()).goals.kcal, 2300);
  await page.getByRole("button", { name: /Health-Verbindungen/ }).click();
  const date = new Date().toLocaleDateString("en-CA");
  const xml = `<?xml version="1.0"?><HealthData><Record type="HKQuantityTypeIdentifierStepCount" sourceName="Test Watch" unit="count" value="4321" startDate="${date} 10:00:00 +0200" endDate="${date} 11:00:00 +0200"/><Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Test Watch" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="${date} 01:00:00 +0200" endDate="${date} 03:00:00 +0200"/><Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Test Watch" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="${date} 02:00:00 +0200" endDate="${date} 04:00:00 +0200"/></HealthData>`;
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
  let state = await saved();
  assert.equal(state.demo, false);
  assert.equal(state.samples.find((s) => s.metric === "sleep").value, 3);
  assert.equal(state.samples.find((s) => s.metric === "steps").value, 4321);
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
    (await saved()).samples.filter((s) => s.metric === "steps").length,
    1,
    "Repeated imports must not duplicate",
  );
  await clickTab("Profil");
  await page.getByRole("button", { name: /Freunde & Challenges/ }).click();
  await page
    .getByRole("button", { name: "Meinen Schrittstand teilen" })
    .click();
  const link = await page
    .getByRole("textbox", { name: "Challenge-Link", exact: true })
    .first()
    .inputValue();
  assert(link.includes("challenge="));
  const api = await page.request.get(`${base}/api/ai`);
  assert.equal((await api.json()).available, false);
  const noAi = await page.request.post(`${base}/api/ai`, {
    data: { mode: "chat", consent: true, messages: [] },
  });
  assert.equal(noAi.status(), 503);
  const badCode = await page.request.get(`${base}/api/foods?barcode=invalid`);
  assert.equal(badCode.status(), 400);
  await clickTab("Ernährung");
  await page.getByRole("button", { name: "Barcode", exact: true }).click();
  await page.getByRole("button", { name: "Kamera starten" }).click();
  await page.getByText(/Kamera nicht verfügbar/).waitFor();
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await clickTab("Gesundheit");
  await page.getByRole("button", { name: /VYRA Assistent/ }).click();
  await page.getByText(/KI-Dienst ist noch nicht angeschlossen/).waitFor();
  await clickTab("Profil");
  await page.getByRole("button", { name: /Daten & Datenschutz/ }).click();
  await page
    .getByRole("button", { name: "Alle lokalen Daten löschen" })
    .click();
  await page.getByRole("button", { name: "Jetzt löschen" }).click();
  await page.reload();
  await page.getByRole("navigation").waitFor();
  assert.equal((await saved()).demo, false);
  assert.equal((await saved()).samples.length, 0);
  assert.equal((await saved()).entries.length, 0);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: 20 responsive screens, diary CRUD + persistence, water, supplements + date separation, cycle, metrics + charts, goals, XML import + overlap merge + deduplication, challenge links, API errors, denied camera.",
  );
} finally {
  await browser.close();
}

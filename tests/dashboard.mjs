import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const page = await browser.newPage({ colorScheme: "light" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const out = process.env.SCREENSHOT_DIR || "/tmp/vyra-dashboard";
await mkdir(out, { recursive: true });
try {
  await page.goto(process.env.BASE_URL || "http://localhost:3021");
  await page.getByRole("heading", { name: "Dein Rhythmus" }).waitFor();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Dunklen Modus aktivieren" })
        .click();
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      await page.locator(".dash-chart .recharts-surface").waitFor();
      await page.screenshot({ path: `${out}/${theme}-${width}.png` });
      assert.equal(
        await page
          .locator(".app-scroll")
          .evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert(await page.locator(".dash-chart .recharts-surface").count());
      for (const metric of ["Schlaf", "Ruhepuls", "Aktivität"]) {
        const button = page
          .getByRole("group", { name: "Verlauf auswählen" })
          .getByRole("button", { name: metric, exact: true });
        await button.click();
        assert.equal(await button.getAttribute("aria-pressed"), "true");
      }
      await page
        .getByRole("group", { name: "Verlauf auswählen" })
        .getByRole("button", { name: "Schlaf", exact: true })
        .click();
    }
  }
  await page.reload();
  await page.getByRole("heading", { name: "Dein Rhythmus" }).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page
    .getByRole("button", { name: "Schlaf im Detail", exact: true })
    .click();
  assert(page.url().includes("#health/sleep"));
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page.getByRole("button", { name: "Vorheriger Tag" }).click();
  await page
    .getByRole("button", { name: "Gesundheitsbalance im Detail", exact: true })
    .click();
  assert(page.url().includes("#health/balance"));
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page.getByRole("button", { name: "250 ml Wasser hinzufügen" }).click();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("vyra-personal-v2"));
    s.samples = [];
    s.demo = false;
    localStorage.setItem("vyra-personal-v2", JSON.stringify(s));
  });
  await page.reload();
  await page.getByText("Noch kein Verlauf", { exact: true }).waitFor();
  assert.deepEqual(
    await page.locator(".performance-rings strong").allTextContents(),
    ["–", "–", "–"],
  );
  await page.screenshot({ path: `${out}/empty-dark.png` });
  await page.getByRole("button", { name: "Hellen Modus aktivieren" }).click();
  await page.reload();
  await page.getByRole("heading", { name: "Dein Rhythmus" }).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: dashboard light/dark at four widths, persistent theme, three chart views, date navigation, metric deep links, water entry and missing-data state.",
  );
} finally {
  await browser.close();
}

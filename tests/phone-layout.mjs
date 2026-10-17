import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const page = await browser.newPage({ colorScheme: "dark" });
const out = process.env.SCREENSHOT_DIR || "/tmp/vyra-phone-layout";
await mkdir(out, { recursive: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.BASE_URL || "http://localhost:3021", {
    waitUntil: "networkidle",
  });
  for (const [width, height] of [
    [1440, 1000],
    [1280, 650],
    [1024, 600],
    [800, 500],
    [390, 844],
    [320, 568],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => {
      const phone = document.querySelector(".phone").getBoundingClientRect();
      const scale = Math.min(
        1,
        (innerHeight - 48) / 844,
        (innerWidth - 48) / 390,
      );
      return innerWidth <= 767
        ? Math.abs(phone.height - innerHeight) < 1
        : Math.abs(phone.height - 844 * scale) < 1 &&
            phone.y + phone.height <= innerHeight + 1;
    });
    const box = await page.locator(".phone").boundingBox();
    if (width > 767) {
      assert(Math.abs(box.height / box.width - 844 / 390) < 0.005);
      assert(box.y >= 0 && box.y + box.height <= height + 1);
    }
    for (const tab of ["Home", "Training", "Ernährung", "Gesundheit", "Profil"]) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: tab, exact: true })
        .click();
      assert.equal(
        await page
          .locator(".app-scroll")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
        false,
        `${tab} overflows at ${width}`,
      );
      const nav = await page.locator(".bottom-nav").boundingBox();
      assert(nav.y + nav.height <= height + 1);
    }
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Home", exact: true })
      .click();
    const rings = await page
      .locator(".performance-rings .performance-ring")
      .evaluateAll((elements) =>
        elements.map((e) => {
          const r = e.getBoundingClientRect();
          return { width: r.width, height: r.height };
        }),
      );
    for (const ring of rings)
      assert(
        Math.abs(ring.width - ring.height) < 1,
        `Ring not round at ${width}: ${JSON.stringify(ring)}`,
      );
    await page.screenshot({ path: `${out}/phone-${width}-${height}.png` });
    await page
      .getByRole("button", { name: "Schlaf im Detail", exact: true })
      .click();
    const ring = await page
      .locator(".performance-hero .performance-ring")
      .boundingBox();
    assert(Math.abs(ring.width - ring.height) < 1);
  }
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.getByRole("button", { name: "Hellen Modus aktivieren" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page.screenshot({ path: `${out}/phone-light-short.png` });
  await page.getByRole("button", { name: /Körperlicher Stress/ }).click();
  await page.getByRole("dialog").waitFor();
  const dialog = await page.getByRole("dialog").boundingBox();
  assert(
    dialog.x >= 0 &&
      dialog.y >= 0 &&
      dialog.x + dialog.width <= 1024 &&
      dialog.y + dialog.height <= 600,
  );
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: stable phone aspect ratio, square dashboard/detail rings, five screens and fixed navigation at seven viewport sizes, scaled dialog interaction.",
  );
} finally {
  await browser.close();
}

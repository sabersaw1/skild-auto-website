// Booking smoke test (Johnny HQ, Skild Phase 2). Loads the schedule page, picks the first day
// with openings and checks that bookable times appear. It NEVER clicks a time or submits anything.
// Runs against Vercel previews (CI) and the live site every hour (HQ's synthetic monitor).
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://www.skildauto.com";
const BYPASS = process.env.VERCEL_BYPASS || "";

test.use({
  baseURL: BASE,
  extraHTTPHeaders: BYPASS ? { "x-vercel-protection-bypass": BYPASS, "x-vercel-set-bypass-cookie": "true" } : {},
});

test("home page loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Skild/i);
});

test("contact page shows the phone number", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("801-584-9804").first()).toBeVisible({ timeout: 15000 });
});

test("schedule shows days and bookable times (no submit)", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByText("Choose a day")).toBeVisible();
  // data-testid on the new picker; the class selector covers the current live markup.
  const DAYS = '[data-testid="day"], div.grid.grid-cols-7 button';
  const dayButtons = page.locator(DAYS);
  await expect(dayButtons.first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("couldn't load the schedule")).toHaveCount(0);
  expect(await dayButtons.count()).toBeGreaterThanOrEqual(7);
  // First day with openings; if this week is full, look one week ahead.
  const OPEN = '[data-testid="day"]:not([disabled]), div.grid.grid-cols-7 button:not([disabled])';
  let open = page.locator(OPEN);
  if ((await open.count()) === 0) {
    await page.getByLabel("Next week").click();
    open = page.locator(OPEN);
  }
  expect(await open.count(), "at least one bookable day in the next two weeks").toBeGreaterThan(0);
  await open.first().click();
  const times = page.getByRole("button", { name: /\d{1,2}:\d{2}\s?(AM|PM)/ });
  await expect(times.first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("couldn't load times")).toHaveCount(0);
});

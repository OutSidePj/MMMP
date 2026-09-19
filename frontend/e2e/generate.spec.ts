import { expect, test } from "@playwright/test";

test("generates a track from a prompt", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("music-prompt").fill("energetic cyberpunk electronic music with futuristic synths");
  await page.getByTestId("bpm-slider").fill("150");
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("generation-loading")).toBeVisible();
  await expect(page.getByTestId("generated-track")).toBeVisible();
  const player = page.getByTestId("audio-player");
  await expect(player).toBeVisible();
  await player.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  if (process.env.UPDATE_SCREENSHOT === "true") {
    await page.screenshot({ path: "../docs/screenshot.png", fullPage: true });
  }
});

test("keeps the generator usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Turn an idea into music/i })).toBeVisible();
  await expect(page.getByTestId("music-prompt")).toBeVisible();
  await expect(page.getByTestId("generate-button")).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

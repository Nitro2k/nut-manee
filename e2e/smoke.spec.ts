import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Serve pages with the same headers Vercel will send, so CSP violations show up locally.
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const globalHeaders = Object.fromEntries(
  vercel.headers
    .filter((h) => h.source === "/(.*)")
    .flatMap((h) => h.headers.map((x) => [x.key.toLowerCase(), x.value])),
);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...globalHeaders } });
  });
});

test("home loads offline-safe, without errors or horizontal scroll", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("request", (req) => {
    if (!req.url().startsWith(baseURL!)) foreignRequests.push(req.url());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  await page.evaluate(() => document.fonts.ready);
  const fontLoaded = await page.evaluate(() =>
    document.fonts.check('16px "Noto Sans Thai Variable"', "ทดสอบ"),
  );
  expect(fontLoaded).toBe(true);

  expect(foreignRequests).toEqual([]);
  expect(errors).toEqual([]);
});

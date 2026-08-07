/**
 * WordPress dependencies
 */
import { test, expect } from "@wordpress/e2e-test-utils-playwright";

test.describe("Front-end smoke", () => {
  test.beforeEach(async ({ requestUtils }) => {
    await requestUtils.deleteAllPosts();
  });

  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/WordPress/i);
  });

  test("published post is visible", async ({ requestUtils, page }) => {
    const title = "E2E smoke post";
    await requestUtils.createPost({ title, status: "publish" });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
  });
});

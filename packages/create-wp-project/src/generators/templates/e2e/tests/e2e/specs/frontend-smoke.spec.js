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
    // wp-env sets the site title from the plugin/theme slug — not always "WordPress".
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);
  });

  test("published post is visible", async ({ requestUtils, page }) => {
    const title = "E2E smoke post";
    const post = await requestUtils.createPost({ title, status: "publish" });

    // Block themes (WP 6+/7 default) often render post titles as h2 on the
    // blog index. Assert on the single post where the title is h1.
    await page.goto(post.link);
    await expect(
      page.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
  });
});

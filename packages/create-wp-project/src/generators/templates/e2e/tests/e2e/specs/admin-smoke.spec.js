/**
 * WordPress dependencies
 */
import { test, expect } from "@wordpress/e2e-test-utils-playwright";

test.describe("Admin smoke", () => {
  test("dashboard loads", async ({ admin, page }) => {
    await admin.visitAdminPage("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("plugins screen loads", async ({ admin, page }) => {
    await admin.visitAdminPage("/plugins.php");
    await expect(
      page.getByRole("heading", { name: "Plugins", level: 1 }),
    ).toBeVisible();
  });

  // Uncomment to assert the scaffolded plugin is listed:
  // test( 'plugin is listed', async ( { admin, page } ) => {
  // 	await admin.visitAdminPage( '/plugins.php' );
  // 	await expect(
  // 		page.getByRole( 'row', { name: /{{pluginName}}/i } )
  // 	).toBeVisible();
  // } );
});

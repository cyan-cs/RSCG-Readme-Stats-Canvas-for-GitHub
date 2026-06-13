import { expect, test, type Page } from "@playwright/test";

const publishedConfig = {
  username: "octocat",
  bgColor: "#0d1117",
  borderColor: "#30363d",
  width: 380,
  height: 208,
  elements: [
    {
      id: "1",
      type: "text",
      x: 16,
      y: 30,
      text: "My GitHub Stats",
      fontSize: 18,
      visible: true,
      color: "#58a6ff",
    },
    {
      id: "2",
      type: "stats",
      x: 16,
      y: 52,
      fontSize: 14,
      visible: true,
      color: "#ffffff",
    },
    {
      id: "3",
      type: "languages",
      x: 16,
      y: 112,
      visible: true,
      color: "#ffffff",
    },
  ],
};

async function openEditor(page: Page) {
  await page.route("**/api/auth/session**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "The Octocat",
          username: "octocat",
          location: "San Francisco",
        },
        expires: "2099-01-01T00:00:00.000Z",
      }),
    }),
  );
  await page.route("**/octocat**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(publishedConfig),
    }),
  );
  await page.route("**/api/stats", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalRepos: 12,
        totalCommits: 512,
        weeklyCommits: 18,
        dailyCommits: 7,
        stars: 42,
        followers: 99,
        following: 8,
        avatarUrl: "",
        languages: [
          { name: "TypeScript", percentage: 70, color: "#3178c6" },
          { name: "CSS", percentage: 30, color: "#663399" },
        ],
      }),
    }),
  );

  await page.goto("/editor");
  await expect(
    page.getByText("Select an element", { exact: true }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("shows editor status and controls preview zoom", async ({ page }) => {
  await openEditor(page);

  await expect(page.getByText("Saved locally")).toBeVisible();
  await expect(page.getByText("No selection")).toBeVisible();
  await expect(page.getByText("380 × 208").last()).toBeVisible();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByRole("button", { name: "110%" })).toBeVisible();

  await page.getByRole("button", { name: "Reset to 100%" }).last().click();
  await expect(page.locator('button[title="Reset to 100%"]')).toHaveText(
    "100%",
  );
});

test("groups secondary actions in the more menu", async ({ page }) => {
  await openEditor(page);

  await page.getByRole("button", { name: "More options" }).click();
  await expect(page.getByRole("button", { name: "Import JSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
});

test("marks changes made after publishing as unpublished", async ({ page }) => {
  await page.route("**/api/publish", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    }),
  );
  await openEditor(page);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(
    page.getByRole("heading", { name: "Your card is live" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();

  await page.getByRole("button", { name: "BACKGROUND" }).click();
  await page.getByRole("button", { name: "#1a1a2e" }).click();
  await expect(page.getByText("Unpublished changes")).toBeVisible();
});

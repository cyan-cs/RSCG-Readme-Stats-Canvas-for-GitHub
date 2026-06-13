import { expect, test } from "@playwright/test";

const locales = ["en", "ja", "ko", "zh"] as const;

test("redirects the root by Accept-Language without shared caching", async ({
  request,
}) => {
  for (const [acceptLanguage, expectedLocale] of [
    ["ja-JP", "ja"],
    ["en-US", "en"],
    ["ko-KR", "ko"],
    ["zh-CN", "zh"],
    ["fr-FR", "en"],
  ] as const) {
    const response = await request.get("/", {
      headers: { "Accept-Language": acceptLanguage },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, "http://127.0.0.1:3000").pathname,
    ).toBe(`/${expectedLocale}`);
    expect(response.headers().vary).toContain("Accept-Language");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("localized landing pages expose SSR SEO content", async ({ page }) => {
  for (const locale of locales) {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toContainText("GitHub");
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale === "zh" ? "zh" : locale,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://rscg.cy-an.net/${locale}`,
    );

    for (const alternateLocale of locales) {
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${alternateLocale}"]`),
      ).toHaveAttribute("href", `https://rscg.cy-an.net/${alternateLocale}`);
    }
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", "https://rscg.cy-an.net/en");

    const html = await response?.text();
    expect(html).toContain("<h1");
    expect(html).not.toContain("Select an element");
    expect(html).not.toMatch(/src_app_editor_page/i);
  }
});

test("sitemap excludes private and generated routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();

  for (const locale of locales) {
    expect(body).toContain(`https://rscg.cy-an.net/${locale}`);
  }
  expect(body).not.toContain("/editor");
  expect(body).not.toContain("/login");
  expect(body).not.toContain("/api/");
  expect(body).not.toContain("lastmod");
});

test("public card HTML is noindex while SVG remains available", async ({
  request,
}) => {
  const htmlResponse = await request.get("/octocat", {
    headers: { Accept: "text/html" },
  });
  expect(htmlResponse.status()).toBe(200);
  expect(htmlResponse.headers()["x-robots-tag"]).toBe("noindex, follow");
  expect(await htmlResponse.text()).toContain(
    '<meta name="robots" content="noindex, follow"/>',
  );

  const svgResponse = await request.get("/octocat", {
    headers: { Accept: "image/svg+xml" },
  });
  expect(svgResponse.status()).toBe(200);
  expect(svgResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(svgResponse.headers()["x-robots-tag"]).toBeUndefined();
  expect(await svgResponse.text()).toContain("<svg");
});

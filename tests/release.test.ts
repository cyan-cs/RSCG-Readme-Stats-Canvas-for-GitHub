import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/i18n/en";
import { ja } from "../src/i18n/ja";
import { ko } from "../src/i18n/ko";
import { zh } from "../src/i18n/zh";
import { resolveLocale, resolveSvgLocale, translate } from "../src/i18n";
import {
  BodyTooLargeError,
  readLimitedTextBody,
} from "../src/lib/request-body";
import {
  generateSVG,
  getLanguageLegend,
  type CardConfig,
} from "../src/lib/svg-engine";
import { buildLinkedCardMarkdown } from "../src/lib/embed-code";
import {
  calculatePreviewFitZoom,
  clampPreviewZoom,
  configFingerprint,
} from "../src/lib/editor-ui";
import { cardConfigSchema, cardElementSchema } from "../src/lib/validation";
import { formatMetricCount } from "../src/lib/site-metrics";

const validConfig: CardConfig = {
  username: "octocat",
  bgColor: "#0d1117",
  borderColor: "#30363d",
  width: 495,
  height: 200,
  elements: [
    {
      id: "title",
      type: "text",
      x: 24,
      y: 40,
      text: "Hello",
      fontSize: 20,
      color: "#ffffff",
      visible: true,
    },
  ],
};

test("card validation accepts a normal configuration", () => {
  assert.equal(cardConfigSchema.safeParse(validConfig).success, true);
});

test("card validation rejects unsafe or ambiguous element data", () => {
  const duplicateIds = {
    ...validConfig,
    elements: [validConfig.elements[0], validConfig.elements[0]],
  };
  assert.equal(cardConfigSchema.safeParse(duplicateIds).success, false);

  assert.equal(
    cardElementSchema.safeParse({
      ...validConfig.elements[0],
      color: "url(javascript:alert(1))",
    }).success,
    false,
  );

  assert.equal(
    cardElementSchema.safeParse({
      ...validConfig.elements[0],
      type: "avatar",
      imageUrl: "https://example.com/avatar.png",
    }).success,
    false,
  );
});

test("SVG output escapes user-provided text", () => {
  const svg = generateSVG(
    {
      ...validConfig,
      elements: [
        {
          ...validConfig.elements[0],
          text: `<script>alert("x")</script>`,
        },
      ],
    },
    null,
  );

  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});

test("background patterns validate and render into the SVG", () => {
  const patternedConfig: CardConfig = {
    ...validConfig,
    backgroundPattern: "grid",
  };
  assert.equal(cardConfigSchema.safeParse(patternedConfig).success, true);
  assert.equal(
    cardConfigSchema.safeParse({
      ...validConfig,
      backgroundPattern: "unsafe-pattern",
    }).success,
    false,
  );

  const svg = generateSVG(patternedConfig, null);
  assert.match(svg, /<pattern id="card-background-/);
  assert.match(svg, /clip-path="url\(#card-background-clip-/);

  const starsSvg = generateSVG(
    { ...validConfig, backgroundPattern: "stars" },
    null,
  );
  assert.match(starsSvg, /width="137" height="101"/);
  assert.match(starsSvg, /width="181" height="149"/);
  assert.match(starsSvg, /width="223" height="173"/);
});

test("locale resolution and dictionaries stay consistent", () => {
  assert.equal(resolveLocale("ja-JP"), "ja");
  assert.equal(resolveLocale("ko-KR"), "ko");
  assert.equal(resolveLocale("zh-CN"), "zh");
  assert.equal(resolveLocale("fr-FR"), "en");
  assert.equal(resolveSvgLocale("zh-TW,zh;q=0.9"), "zh-TW");
  assert.equal(translate("ja", "actions.save"), ja["actions.save"]);

  const englishKeys = Object.keys(en).sort();
  for (const dictionary of [ja, ko, zh]) {
    assert.deepEqual(Object.keys(dictionary).sort(), englishKeys);
  }
});

test("request bodies are limited by header and streamed size", async () => {
  await assert.rejects(
    readLimitedTextBody(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-length": "10" },
        body: "small",
      }),
      5,
    ),
    BodyTooLargeError,
  );

  await assert.rejects(
    readLimitedTextBody(
      new Request("http://localhost", {
        method: "POST",
        body: "too large",
      }),
      5,
    ),
    BodyTooLargeError,
  );
});

test("published card markdown links the image to the RSCG site", () => {
  assert.equal(
    buildLinkedCardMarkdown("https://rscg.cy-an.net/octocat"),
    "[![GitHub Stats Card](https://rscg.cy-an.net/octocat)](https://rscg.cy-an.net)",
  );
});

test("site metric counts are formatted safely", () => {
  assert.equal(formatMetricCount(1234567), "1,234,567");
  assert.equal(formatMetricCount(-20), "0");
  assert.equal(formatMetricCount(12.9), "12");
});

test("editor zoom helpers clamp and fit predictably", () => {
  assert.equal(clampPreviewZoom(0.01), 0.25);
  assert.equal(clampPreviewZoom(3), 2);
  assert.equal(clampPreviewZoom(1.26), 1.3);
  assert.equal(calculatePreviewFitZoom(900, 650, 850, 550), 1);
  assert.equal(calculatePreviewFitZoom(320, 240, 1200, 800), 0.25);
});

test("config fingerprints change with publishable card changes", () => {
  assert.equal(configFingerprint(validConfig), configFingerprint(validConfig));
  assert.notEqual(
    configFingerprint(validConfig),
    configFingerprint({ ...validConfig, width: validConfig.width + 8 }),
  );
});

test("language legend defaults to six languages and groups the rest", () => {
  const languages = Array.from({ length: 8 }, (_, index) => ({
    name: `Language ${index + 1}`,
    color: "#ffffff",
    size: 8 - index,
  }));
  const legend = getLanguageLegend(languages);
  assert.equal(legend.length, 7);
  assert.equal(legend[5].name, "Language 6");
  assert.equal(legend[6].name, "Other");
  assert.equal(
    legend.reduce((sum, language) => sum + language.percent, 0),
    100,
  );
});

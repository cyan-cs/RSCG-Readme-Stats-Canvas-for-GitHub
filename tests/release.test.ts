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
import { generateSVG, type CardConfig } from "../src/lib/svg-engine";
import {
  cardConfigSchema,
  cardElementSchema,
} from "../src/lib/validation";

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

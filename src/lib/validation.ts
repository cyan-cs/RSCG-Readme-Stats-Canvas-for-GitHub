import { z } from "zod";

const MAX_TEXT_LENGTH = 2_000;
const MAX_ID_LENGTH = 128;
const MAX_URL_LENGTH = 2_048;
const MAX_COORDINATE = 10_000;

const finiteCoordinate = z
  .number()
  .finite()
  .min(-MAX_COORDINATE)
  .max(MAX_COORDINATE);
const svgColorSchema = z
  .string()
  .max(50)
  .regex(
    /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20}|(?:rgb|rgba|hsl|hsla)\([^<>"']{1,40}\))$/,
    "Invalid color",
  );
const imageUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine((value) => {
    if (value === "") return true;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "avatars.githubusercontent.com"
      );
    } catch {
      return false;
    }
  }, "Image URL must be a GitHub avatar URL");

export const lineStyleSchema = z.enum([
  "solid",
  "dotted",
  "wavy",
  "double",
  "dash-dot",
  "double-dot",
  "dashed",
  "zigzag",
]);

export const elementTypeSchema = z.enum([
  "text",
  "stats",
  "languages",
  "avatar",
  "line",
  "shape",
  "stars",
  "followers",
  "contributions",
  "badge",
  "progress",
  "calendar",
  "rating",
]);

export const cardElementSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    type: elementTypeSchema,
    x: finiteCoordinate,
    y: finiteCoordinate,
    text: z.string().max(MAX_TEXT_LENGTH).optional(),
    fontSize: z.number().finite().min(1).max(200).optional(),
    color: svgColorSchema.optional(),
    visible: z.boolean(),
    lineStyle: lineStyleSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    badgeText: z.string().max(MAX_TEXT_LENGTH).optional(),
    badgeColor: svgColorSchema.optional(),
    progress: z.number().finite().min(0).max(100).optional(),
    progressLabel: z.string().max(MAX_TEXT_LENGTH).optional(),
    progressColor: svgColorSchema.optional(),
    lineWidth: z.number().finite().min(0).max(MAX_COORDINATE).optional(),
    lineHeight: z
      .number()
      .finite()
      .min(-MAX_COORDINATE)
      .max(MAX_COORDINATE)
      .optional(),
    lineStrokeWidth: z.number().finite().min(1).max(20).optional(),
    progressBarWidth: z.number().finite().min(0).max(MAX_COORDINATE).optional(),
    // Keep accepting the old 40px minimum. The editor and renderer clamp it
    // to the current 80px visual minimum so existing saved cards still load.
    languageBarWidth: z.number().finite().min(40).max(800).optional(),
    shapeType: z
      .enum([
        "rectangle",
        "rounded-rectangle",
        "circle",
        "ellipse",
        "triangle",
        "diamond",
        "arrow",
        "star",
        "hexagon",
        "speech-bubble",
      ])
      .optional(),
    shapeWidth: z.number().finite().min(8).max(MAX_COORDINATE).optional(),
    shapeHeight: z.number().finite().min(8).max(MAX_COORDINATE).optional(),
    shapeStrokeColor: svgColorSchema.optional(),
    shapeStrokeWidth: z.number().finite().min(0).max(20).optional(),
    shapeRadius: z.number().finite().min(0).max(MAX_COORDINATE).optional(),
    calendarFormat: z.enum(["relative", "date", "both"]).optional(),
    locked: z.boolean().optional(),
    textDecoration: z
      .enum([
        "none",
        "underline",
        "strikethrough",
        "overline",
        "wavy",
        "dotted",
        "double",
      ])
      .optional(),
    x2: finiteCoordinate.optional(),
    y2: finiteCoordinate.optional(),
  })
  .strict();

export const cardConfigSchema = z
  .object({
    username: z.string().max(100),
    bgColor: svgColorSchema,
    borderColor: svgColorSchema,
    width: z.number().finite().min(50).max(1200),
    height: z.number().finite().min(20).max(800),
    elements: z.array(cardElementSchema).max(100),
  })
  .strict()
  .superRefine((config, ctx) => {
    const seen = new Set<string>();
    config.elements.forEach((element, index) => {
      if (seen.has(element.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Element IDs must be unique",
          path: ["elements", index, "id"],
        });
      }
      seen.add(element.id);
    });
  });

export type CardConfigValidated = z.infer<typeof cardConfigSchema>;
export type CardElementValidated = z.infer<typeof cardElementSchema>;

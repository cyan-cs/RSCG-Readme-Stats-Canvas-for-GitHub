import { GitHubStats } from "./github-api";
import { translate } from "@/i18n";

export type ElementType =
  | "text"
  | "stats"
  | "languages"
  | "avatar"
  | "line"
  | "shape"
  | "stars"
  | "followers"
  | "contributions"
  | "badge"
  | "progress"
  | "calendar"
  | "rating";

export type ShapeType =
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "arrow"
  | "star"
  | "hexagon"
  | "speech-bubble";

export type BackgroundPattern =
  | "none"
  | "grid"
  | "fine-grid"
  | "ruled"
  | "dots"
  | "cross"
  | "diagonal"
  | "waves"
  | "stars"
  | "nebula";

export const LANGUAGE_MIN_WIDTH = 80;
export const LANGUAGE_MAX_WIDTH = 800;
export const DEFAULT_LANGUAGE_COUNT = 6;
export const MAX_LANGUAGE_COUNT = 10;

export interface CardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  color?: string;
  visible: boolean;
  lineStyle?:
    | "solid"
    | "dotted"
    | "wavy"
    | "double"
    | "dash-dot"
    | "double-dot"
    | "dashed"
    | "zigzag";
  imageUrl?: string;
  textAlign?: "left" | "center" | "right";
  badgeText?: string;
  badgeColor?: string;
  progress?: number;
  progressLabel?: string;
  progressColor?: string;
  lineWidth?: number;
  lineHeight?: number;
  lineStrokeWidth?: number;
  progressBarWidth?: number;
  languageBarWidth?: number;
  languageCount?: number;
  shapeType?: ShapeType;
  shapeWidth?: number;
  shapeHeight?: number;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  shapeRadius?: number;
  calendarFormat?: "relative" | "date" | "both";
  locked?: boolean;
  textDecoration?:
    | "none"
    | "underline"
    | "strikethrough"
    | "overline"
    | "wavy"
    | "dotted"
    | "double";
  /** Line end-point coordinates (overrides lineWidth/lineHeight for lines). Falls back to x+lineWidth, y+lineHeight. */
  x2?: number;
  y2?: number;
}

export interface CardConfig {
  username: string;
  bgColor: string;
  borderColor: string;
  backgroundPattern?: BackgroundPattern;
  width: number;
  height: number;
  elements: CardElement[];
}

/* ── Utilities ── */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeSvgId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function compactValue(value: number): string {
  return value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, "");
}

function formatCount(n: number, locale: string): string {
  if (n < 0) return "N/A";
  const normalizedLocale = locale.toLowerCase();
  if (n >= 10_000) {
    const value = compactValue(n / 10_000);
    if (normalizedLocale.startsWith("ko")) return `${value}만`;
    if (
      normalizedLocale.startsWith("zh-tw") ||
      normalizedLocale.startsWith("zh-hk") ||
      normalizedLocale.startsWith("zh-mo") ||
      normalizedLocale.includes("hant")
    ) {
      return `${value}萬`;
    }
    if (
      normalizedLocale.startsWith("ja") ||
      normalizedLocale.startsWith("zh")
    ) {
      return `${value}万`;
    }
  }
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return new Intl.NumberFormat(locale || "en", {
    maximumFractionDigits: 0,
  }).format(n);
}

function getSvgFontFamily(locale: string): string {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("ja")) {
    return "'Noto Sans CJK JP','Noto Sans JP',Arial,sans-serif";
  }
  if (normalizedLocale.startsWith("ko")) {
    return "'Noto Sans CJK KR','Noto Sans KR',Arial,sans-serif";
  }
  if (
    normalizedLocale.startsWith("zh-tw") ||
    normalizedLocale.startsWith("zh-hk") ||
    normalizedLocale.startsWith("zh-mo") ||
    normalizedLocale.includes("hant")
  ) {
    return "'Noto Sans CJK TC','Noto Sans TC',Arial,sans-serif";
  }
  if (normalizedLocale.startsWith("zh")) {
    return "'Noto Sans CJK SC','Noto Sans SC',Arial,sans-serif";
  }
  return "'Noto Sans',Arial,sans-serif";
}

function formatCalendarDate(date: Date, locale: string): string {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("ja") || normalizedLocale.startsWith("zh")) {
    const parts = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}年${values.month}月${values.day}日`;
  }
  if (normalizedLocale.startsWith("ko")) {
    const parts = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}년 ${values.month}월 ${values.day}일`;
  }
  return new Intl.DateTimeFormat(locale || "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function safeAvatarUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "avatars.githubusercontent.com"
      ? `/api/avatar?src=${encodeURIComponent(url.toString())}`
      : "";
  } catch {
    return "";
  }
}

export interface LanguageLegendItem {
  name: string;
  color: string;
  size: number;
  percent: number;
}

export function getLanguageLegend(
  languages: GitHubStats["languages"],
  otherLabel = "Other",
  languageCount = DEFAULT_LANGUAGE_COUNT,
): LanguageLegendItem[] {
  const valid = languages.filter(
    (language) => Number.isFinite(language.size) && language.size > 0,
  );
  if (valid.length === 0) return [];

  const limit = Math.max(
    1,
    Math.min(MAX_LANGUAGE_COUNT, Math.trunc(languageCount)),
  );
  const visible = valid.slice(0, limit).map((language) => ({ ...language }));
  if (valid.length > limit) {
    visible.push({
      name: otherLabel,
      color: "#8b949e",
      size: valid
        .slice(limit)
        .reduce((sum, language) => sum + language.size, 0),
    });
  }

  const total = visible.reduce((sum, language) => sum + language.size, 0);
  const exact = visible.map((language) => (language.size / total) * 100);
  const percentages = exact.map(Math.floor);
  const remaining =
    100 - percentages.reduce((sum, percent) => sum + percent, 0);
  const remainderOrder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < remaining; index++) {
    percentages[remainderOrder[index % remainderOrder.length].index]++;
  }

  return visible.map((language, index) => ({
    ...language,
    percent: percentages[index],
  }));
}

function polygonPoints(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function regularPolygonPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  rotation = -Math.PI / 2,
): string {
  return polygonPoints(
    Array.from({ length: sides }, (_, index) => {
      const angle = rotation + (index * Math.PI * 2) / sides;
      return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    }),
  );
}

function starPoints(
  cx: number,
  cy: number,
  outerX: number,
  outerY: number,
): string {
  return polygonPoints(
    Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 1 : 0.45;
      return [
        cx + Math.cos(angle) * outerX * radius,
        cy + Math.sin(angle) * outerY * radius,
      ];
    }),
  );
}

function renderBackgroundPattern(
  pattern: BackgroundPattern,
  cardW: number,
  cardH: number,
  defsParts: string[],
): string {
  if (pattern === "none") return "";

  const id = safeSvgId("card-background", pattern);
  const muted = "#8b949e";
  const light = "#ffffff";

  if (pattern === "nebula") {
    defsParts.push(
      `<radialGradient id="${id}-a" cx="25%" cy="25%" r="65%"><stop offset="0%" stop-color="#7d2ae8" stop-opacity="0.42"/><stop offset="100%" stop-color="#7d2ae8" stop-opacity="0"/></radialGradient>`,
      `<radialGradient id="${id}-b" cx="80%" cy="70%" r="70%"><stop offset="0%" stop-color="#1f6feb" stop-opacity="0.34"/><stop offset="100%" stop-color="#1f6feb" stop-opacity="0"/></radialGradient>`,
      `<pattern id="${id}-stars-a" width="137" height="101" patternUnits="userSpaceOnUse"><circle cx="9" cy="12" r="1" fill="${light}" opacity="0.7"/><circle cx="51" cy="7" r="0.6" fill="${light}" opacity="0.5"/><circle cx="94" cy="34" r="1.2" fill="${light}" opacity="0.8"/><circle cx="128" cy="79" r="0.7" fill="${light}" opacity="0.55"/><circle cx="31" cy="88" r="0.8" fill="${light}" opacity="0.65"/></pattern>`,
      `<pattern id="${id}-stars-b" width="181" height="149" patternUnits="userSpaceOnUse" patternTransform="translate(23 17)"><circle cx="18" cy="63" r="0.5" fill="${light}" opacity="0.4"/><circle cx="76" cy="21" r="0.8" fill="${light}" opacity="0.55"/><circle cx="143" cy="92" r="0.6" fill="${light}" opacity="0.48"/><path d="M164 31V37M161 34H167" stroke="${light}" stroke-width="0.8" opacity="0.55"/></pattern>`,
    );
    return `<rect width="${cardW}" height="${cardH}" fill="url(#${id}-a)"/><rect width="${cardW}" height="${cardH}" fill="url(#${id}-b)"/><rect width="${cardW}" height="${cardH}" fill="url(#${id}-stars-a)"/><rect width="${cardW}" height="${cardH}" fill="url(#${id}-stars-b)"/>`;
  }

  if (pattern === "stars") {
    defsParts.push(
      `<pattern id="${id}-a" width="137" height="101" patternUnits="userSpaceOnUse"><circle cx="7" cy="11" r="1.1" fill="${light}" opacity="0.72"/><circle cx="43" cy="31" r="0.6" fill="${light}" opacity="0.48"/><circle cx="102" cy="9" r="0.9" fill="${light}" opacity="0.62"/><circle cx="129" cy="73" r="1.4" fill="${light}" opacity="0.8"/><circle cx="68" cy="89" r="0.7" fill="${light}" opacity="0.55"/></pattern>`,
      `<pattern id="${id}-b" width="181" height="149" patternUnits="userSpaceOnUse" patternTransform="translate(19 13)"><circle cx="17" cy="83" r="0.5" fill="${light}" opacity="0.4"/><circle cx="77" cy="24" r="0.8" fill="${light}" opacity="0.58"/><circle cx="151" cy="117" r="0.6" fill="${light}" opacity="0.46"/><path d="M119 58V64M116 61H122" stroke="${light}" stroke-width="0.8" opacity="0.6"/></pattern>`,
      `<pattern id="${id}-c" width="223" height="173" patternUnits="userSpaceOnUse" patternTransform="translate(-31 29)"><circle cx="28" cy="19" r="0.45" fill="${light}" opacity="0.35"/><circle cx="94" cy="139" r="0.55" fill="${light}" opacity="0.42"/><circle cx="197" cy="67" r="0.75" fill="${light}" opacity="0.5"/></pattern>`,
    );
    return `<rect width="${cardW}" height="${cardH}" fill="url(#${id}-a)"/><rect width="${cardW}" height="${cardH}" fill="url(#${id}-b)"/><rect width="${cardW}" height="${cardH}" fill="url(#${id}-c)"/>`;
  }

  let content = "";
  let width = 24;
  let height = 24;
  switch (pattern) {
    case "grid":
      width = 32;
      height = 32;
      content = `<path d="M32 0H0V32" fill="none" stroke="${muted}" stroke-width="1" opacity="0.26"/>`;
      break;
    case "fine-grid":
      width = 12;
      height = 12;
      content = `<path d="M12 0H0V12" fill="none" stroke="${muted}" stroke-width="0.7" opacity="0.2"/>`;
      break;
    case "ruled":
      width = 24;
      height = 24;
      content = `<path d="M0 23.5H24" stroke="${muted}" stroke-width="1" opacity="0.3"/>`;
      break;
    case "dots":
      width = 18;
      height = 18;
      content = `<circle cx="2" cy="2" r="1.2" fill="${muted}" opacity="0.42"/>`;
      break;
    case "cross":
      width = 24;
      height = 24;
      content = `<path d="M12 8V16M8 12H16" stroke="${muted}" stroke-width="1" opacity="0.34"/>`;
      break;
    case "diagonal":
      width = 18;
      height = 18;
      content = `<path d="M-4 18L18-4M5 22L22 5" stroke="${muted}" stroke-width="1" opacity="0.24"/>`;
      break;
    case "waves":
      width = 48;
      height = 24;
      content = `<path d="M0 12C8 3 16 3 24 12S40 21 48 12" fill="none" stroke="${muted}" stroke-width="1.2" opacity="0.28"/>`;
      break;
  }

  defsParts.push(
    `<pattern id="${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse">${content}</pattern>`,
  );
  return `<rect width="${cardW}" height="${cardH}" fill="url(#${id})"/>`;
}

/* ── Text measurement ── */

export function estimateTextWidth(
  text: string,
  fontSize: number,
  bold: boolean = false,
): number {
  let total = 0;
  const f = fontSize;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (cp >= 0x10000) i++;
    let w: number;
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0x20000 && cp <= 0x2ffff) ||
      (cp >= 0x3000 && cp <= 0x303f)
    ) {
      w = 1.0;
    } else if (cp >= 0x3040 && cp <= 0x309f) {
      w = 0.92;
    } else if (cp >= 0x30a0 && cp <= 0x30ff) {
      w = 0.84;
    } else if (
      (cp >= 0x1100 && cp <= 0x11ff) ||
      (cp >= 0x3130 && cp <= 0x318f) ||
      (cp >= 0xa960 && cp <= 0xa97f) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xd7b0 && cp <= 0xd7ff)
    ) {
      w = 1.0;
    } else if (cp >= 0xff01 && cp <= 0xff60) {
      w = 1.0;
    } else if (cp >= 0xffe0 && cp <= 0xffe6) {
      w = 1.0;
    } else if (cp >= 0x41 && cp <= 0x5a) {
      w = 0.636;
    } else if (cp >= 0x61 && cp <= 0x7a) {
      w = 0.53;
    } else if (cp >= 0x30 && cp <= 0x39) {
      w = 0.582;
    } else if (cp === 0x20) {
      w = 0.304;
    } else if (
      (cp >= 0x21 && cp <= 0x2f) ||
      (cp >= 0x3a && cp <= 0x40) ||
      (cp >= 0x5b && cp <= 0x60) ||
      (cp >= 0x7b && cp <= 0x7e)
    ) {
      w = 0.5;
    } else {
      w = 0.582;
    }
    total += w;
  }
  const boldFactor = bold ? 1.04 : 1.0;
  return total * f * boldFactor;
}

/* ── Proportional scale ── */

const BASE_WIDTH = 495; // reference design width

function fs(size: number, scale: number): number {
  return Math.round(size * scale);
}

/* ── Main SVG generation ── */

export function generateSVG(
  config: CardConfig,
  stats: GitHubStats | null,
  locale = "en",
): string {
  const { bgColor, borderColor, width, height, elements } = config;
  const cardW = width;
  const cardH = height;
  const fontFamily = getSvgFontFamily(locale);
  const fontScale = Math.min(
    1.2,
    Math.max(0.5, (cardW || BASE_WIDTH) / BASE_WIDTH),
  );

  const svgOpen =
    cardW > 0 && cardH > 0
      ? `<svg width="${cardW}" viewBox="0 0 ${cardW} ${cardH}" fill="none" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:${fontFamily} !important}</style>`
      : `<svg width="495" height="200" viewBox="0 0 495 200" fill="none" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:${fontFamily} !important}</style>`;

  const defsParts: string[] = [];
  const backgroundPattern = renderBackgroundPattern(
    config.backgroundPattern || "none",
    cardW,
    cardH,
    defsParts,
  );
  const backgroundClipId = safeSvgId(
    "card-background-clip",
    `${config.backgroundPattern || "none"}:${cardW}:${cardH}`,
  );
  defsParts.push(
    `<clipPath id="${backgroundClipId}"><rect width="${cardW}" height="${cardH}" rx="${fs(12, fontScale)}"/></clipPath>`,
  );

  const renderElement = (el: CardElement) => {
    if (!el.visible) return "";

    const color = escapeXml(el.color || "#ffffff");
    const fontSize = el.fontSize || 16;

    switch (el.type) {
      case "text": {
        const align = el.textAlign || "left";
        let anchor: string;
        let xPos: number;
        if (align === "center") {
          anchor = "middle";
          xPos = el.x;
        } else if (align === "right") {
          anchor = "end";
          xPos = el.x;
        } else {
          anchor = "start";
          xPos = el.x;
        }
        return `<text x="${xPos}" y="${el.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="${anchor}">${escapeXml(el.text || "")}</text>`;
      }

      case "line": {
        const sw = el.lineStrokeWidth || 2;
        const ls = el.lineStyle || "solid";
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x2 !== undefined ? el.x2 : x1 + (el.lineWidth || 0);
        const y2 = el.y2 !== undefined ? el.y2 : y1 + (el.lineHeight || 0);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return "";

        const isDiag = Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5;
        const isHoriz = Math.abs(dy) < 0.5;
        const gap = Math.max(2, Math.round(sw * 0.7));

        const renderLine = (
          ax: number,
          ay: number,
          bx: number,
          by: number,
          dash: string,
          sw2: number,
        ) =>
          `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${sw2}" stroke-dasharray="${dash}" />`;

        // Diagonal or general line — simple line with style
        if (isDiag || (!isHoriz && !isDiag)) {
          switch (ls) {
            case "dotted":
              return renderLine(x1, y1, x2, y2, "4 4", sw);
            case "dashed":
              return renderLine(x1, y1, x2, y2, "12 6", sw);
            case "dash-dot":
              return renderLine(x1, y1, x2, y2, "10 4 2 4", sw);
            default:
              return renderLine(x1, y1, x2, y2, "none", sw);
          }
        }

        // Horizontal line
        if (isHoriz) {
          const hw =
            dx !== 0
              ? Math.abs(dx)
              : Math.min(200, cardW - 2 * Math.max(x1, 0) - 24);
          const sx = Math.min(x1, x2);
          const sy = y1;
          switch (ls) {
            case "wavy":
              return `<path d="M ${sx} ${sy} Q ${sx + hw / 4} ${sy - 10}, ${sx + hw / 2} ${sy} T ${sx + hw} ${sy}" fill="none" stroke="${color}" stroke-width="${sw}" />`;
            case "double":
              return (
                renderLine(sx, sy - gap, sx + hw, sy - gap, "none", sw) +
                renderLine(sx, sy + gap, sx + hw, sy + gap, "none", sw)
              );
            case "dash-dot":
              return renderLine(sx, sy, sx + hw, sy, "10 4 2 4", sw);
            case "double-dot":
              return (
                renderLine(sx, sy - gap, sx + hw, sy - gap, "4 4", sw) +
                renderLine(sx, sy + gap, sx + hw, sy + gap, "4 4", sw)
              );
            case "zigzag":
              return `<polyline points="${sx},${sy} ${sx + hw / 6},${sy - 10} ${sx + hw / 3},${sy} ${sx + hw / 2},${sy - 10} ${sx + (hw * 2) / 3},${sy} ${sx + (hw * 5) / 6},${sy - 10} ${sx + hw},${sy}" fill="none" stroke="${color}" stroke-width="${sw}" />`;
            case "dashed":
              return renderLine(sx, sy, sx + hw, sy, "12 6", sw);
            default:
              return renderLine(
                sx,
                sy,
                sx + hw,
                sy,
                ls === "dotted" ? "4 4" : "none",
                sw,
              );
          }
        }

        // Vertical line
        const hh = dy !== 0 ? Math.abs(dy) : 80;
        const sx = x1;
        const sy = Math.min(y1, y2);
        switch (ls) {
          case "wavy":
            return `<path d="M ${sx} ${sy} Q ${sx + 10} ${sy + hh / 4}, ${sx} ${sy + hh / 2} T ${sx} ${sy + hh}" fill="none" stroke="${color}" stroke-width="${sw}" />`;
          case "double":
            return (
              renderLine(sx, sy - gap, sx, sy + hh, "none", sw) +
              renderLine(sx, sy + gap, sx, sy + hh + gap * 2, "none", sw)
            );
          case "dash-dot":
            return renderLine(sx, sy, sx, sy + hh, "10 4 2 4", sw);
          case "double-dot":
            return (
              renderLine(sx, sy - gap, sx, sy + hh, "4 4", sw) +
              renderLine(sx, sy + gap, sx, sy + hh + gap * 2, "4 4", sw)
            );
          case "zigzag":
            return `<polyline points="${sx},${sy} ${sx + 8},${sy + 10} ${sx + 16},${sy} ${sx + 24},${sy + 10} ${sx + 32},${sy} ${sx + 40},${sy + 10} ${sx + 48},${sy}" fill="none" stroke="${color}" stroke-width="${sw}" />`;
          case "dashed":
            return renderLine(sx, sy, sx, sy + hh, "12 6", sw);
          default:
            return renderLine(
              sx,
              sy,
              sx,
              sy + hh,
              ls === "dotted" ? "4 4" : "none",
              sw,
            );
        }
      }

      case "shape": {
        const shapeWidth = Math.max(8, el.shapeWidth || 96);
        const shapeHeight = Math.max(8, el.shapeHeight || 64);
        const strokeColor = escapeXml(el.shapeStrokeColor || "transparent");
        const strokeWidth = Math.max(0, el.shapeStrokeWidth || 0);
        const shapeType = el.shapeType || "rectangle";
        const cx = el.x + shapeWidth / 2;
        const cy = el.y + shapeHeight / 2;
        const common = `fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"`;
        if (shapeType === "circle") {
          const diameter = Math.min(shapeWidth, shapeHeight);
          return `<circle cx="${el.x + diameter / 2}" cy="${el.y + diameter / 2}" r="${diameter / 2}" ${common} />`;
        }
        if (shapeType === "ellipse") {
          return `<ellipse cx="${cx}" cy="${cy}" rx="${shapeWidth / 2}" ry="${shapeHeight / 2}" ${common} />`;
        }
        if (shapeType === "triangle") {
          return `<polygon points="${polygonPoints([
            [cx, el.y],
            [el.x + shapeWidth, el.y + shapeHeight],
            [el.x, el.y + shapeHeight],
          ])}" ${common} />`;
        }
        if (shapeType === "diamond") {
          return `<polygon points="${polygonPoints([
            [cx, el.y],
            [el.x + shapeWidth, cy],
            [cx, el.y + shapeHeight],
            [el.x, cy],
          ])}" ${common} />`;
        }
        if (shapeType === "arrow") {
          return `<polygon points="${polygonPoints([
            [el.x, el.y + shapeHeight * 0.28],
            [el.x + shapeWidth * 0.58, el.y + shapeHeight * 0.28],
            [el.x + shapeWidth * 0.58, el.y],
            [el.x + shapeWidth, cy],
            [el.x + shapeWidth * 0.58, el.y + shapeHeight],
            [el.x + shapeWidth * 0.58, el.y + shapeHeight * 0.72],
            [el.x, el.y + shapeHeight * 0.72],
          ])}" ${common} />`;
        }
        if (shapeType === "star") {
          return `<polygon points="${starPoints(cx, cy, shapeWidth / 2, shapeHeight / 2)}" ${common} />`;
        }
        if (shapeType === "hexagon") {
          return `<polygon points="${regularPolygonPoints(cx, cy, shapeWidth / 2, shapeHeight / 2, 6, 0)}" ${common} />`;
        }
        if (shapeType === "speech-bubble") {
          const tailTop = el.y + shapeHeight * 0.72;
          const radius = Math.max(
            0,
            Math.min(
              el.shapeRadius ?? 10,
              Math.min(shapeWidth, shapeHeight) / 3,
            ),
          );
          return `<path d="M ${el.x + radius} ${el.y} H ${el.x + shapeWidth - radius} Q ${el.x + shapeWidth} ${el.y} ${el.x + shapeWidth} ${el.y + radius} V ${tailTop - radius} Q ${el.x + shapeWidth} ${tailTop} ${el.x + shapeWidth - radius} ${tailTop} H ${el.x + shapeWidth * 0.48} L ${el.x + shapeWidth * 0.3} ${el.y + shapeHeight} L ${el.x + shapeWidth * 0.32} ${tailTop} H ${el.x + radius} Q ${el.x} ${tailTop} ${el.x} ${tailTop - radius} V ${el.y + radius} Q ${el.x} ${el.y} ${el.x + radius} ${el.y} Z" ${common} />`;
        }
        const radius =
          shapeType === "rounded-rectangle"
            ? Math.max(
                4,
                Math.min(
                  el.shapeRadius ?? 12,
                  Math.min(shapeWidth, shapeHeight) / 2,
                ),
              )
            : Math.max(
                0,
                Math.min(
                  el.shapeRadius || 0,
                  Math.min(shapeWidth, shapeHeight) / 2,
                ),
              );
        return `<rect x="${el.x}" y="${el.y}" width="${shapeWidth}" height="${shapeHeight}" rx="${radius}" ${common} />`;
      }

      case "avatar": {
        const clipId = safeSvgId("clip", el.id);
        const imageHref = safeAvatarUrl(el.imageUrl);
        if (!imageHref) return "";
        defsParts.push(
          `<clipPath id="${clipId}"><circle cx="${el.x + 25}" cy="${el.y + 25}" r="25" /></clipPath>`,
        );
        return `<image x="${el.x}" y="${el.y}" width="50" height="50" href="${imageHref}" clip-path="url(#${clipId})" />`;
      }

      case "stats":
        return renderStats(el, stats, color, fontSize, fontScale, locale);

      case "languages":
        return renderLanguages(
          el,
          stats,
          cardW,
          defsParts,
          fontScale,
          fontSize,
          locale,
        );

      case "stars":
        return renderStars(el, stats, color, fontSize, fontScale, locale);

      case "followers":
        return renderFollowers(el, stats, color, fontSize, fontScale, locale);

      case "contributions":
        return renderContributions(el, stats, cardW, fontScale, locale);

      case "badge":
        return renderBadge(el, fontSize);

      case "progress": {
        const barW = el.progressBarWidth || fs(100, fontScale);
        return renderProgress(el, color, barW, fontScale, locale);
      }

      case "calendar": {
        const now = new Date();
        const dateStr = formatCalendarDate(now, locale);
        const label =
          el.calendarFormat === "relative"
            ? translate(locale, "svg.calendar.updatedRecently")
            : `${translate(locale, "svg.calendar.updated")}: ${dateStr}`;
        return `<g transform="translate(${el.x}, ${el.y})"><text x="0" y="0" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${color}" opacity="0.6">${escapeXml(label)}</text></g>`;
      }

      case "rating":
        return renderRating(el, stats, color, fontSize, fontScale, locale);

      default:
        return "";
    }
  };

  const renderedElements = elements.map(renderElement).join("");

  return `
    ${svgOpen}
      <defs>${defsParts.join("")}</defs>
      <rect width="${cardW || 495}" height="${cardH || 200}" rx="${fs(12, fontScale)}" fill="${escapeXml(bgColor || "#0d1117")}"/>
      <g clip-path="url(#${backgroundClipId})">${backgroundPattern}</g>
      <rect width="${cardW || 495}" height="${cardH || 200}" rx="${fs(12, fontScale)}" fill="none" stroke="${escapeXml(borderColor || "#30363d")}" stroke-width="${Math.max(1, fs(1, fontScale))}"/>
      ${renderedElements}
    </svg>
  `.trim();
}

/* ── Stats block ── */

function renderStats(
  el: CardElement,
  stats: GitHubStats | null,
  color: string,
  fontSize: number,
  sc: number,
  locale = "en",
): string {
  const s10 = fs(10, sc);
  const s20 = fs(20, sc);
  const s16 = fs(16, sc);
  const dy22 = fs(22, sc);
  const dy50 = fs(50, sc);
  if (!stats) {
    const unavailableLabel = translate(locale, "element.stats.short");
    const unavailableText = translate(locale, "svg.common.unavailable");
    return `
      <g transform="translate(${el.x}, ${el.y})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${unavailableLabel}</text>
        <text x="0" y="${fs(24, sc)}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${unavailableText}</text>
      </g>`;
  }

  const items = [
    {
      label: translate(locale, "svg.stats.repositories"),
      value: String(stats.totalRepos),
    },
    {
      label: translate(locale, "svg.stats.totalCommits"),
      value: formatCount(stats.totalCommits, locale),
    },
    {
      label: translate(locale, "svg.stats.weekly"),
      value: formatCount(stats.weeklyCommits, locale),
    },
    {
      label: translate(locale, "svg.stats.today"),
      value: formatCount(stats.dailyCommits, locale),
    },
  ];

  const colPadding = Math.round(fs(40, sc) * 1);
  const labelW0 = Math.ceil(estimateTextWidth(items[0].label, s10, true));
  const valW0 = Math.ceil(estimateTextWidth(items[0].value, s20, true));
  const col0W = Math.max(labelW0, valW0) + 4;
  const col1X = col0W + colPadding;

  return `
    <g transform="translate(${el.x}, ${el.y})">
      <g>
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${escapeXml(items[0].label)}</text>
        <text x="0" y="${dy22}" font-family="Arial, sans-serif" font-size="${s20}" font-weight="bold" fill="${color}">${items[0].value}</text>
      </g>
      <g transform="translate(${col1X}, 0)">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${escapeXml(items[1].label)}</text>
        <text x="0" y="${dy22}" font-family="Arial, sans-serif" font-size="${s20}" font-weight="bold" fill="${color}">${items[1].value}</text>
      </g>
      <g transform="translate(0, ${dy50})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${escapeXml(items[2].label)}</text>
        <text x="0" y="${dy22}" font-family="Arial, sans-serif" font-size="${s16}" font-weight="bold" fill="${color}">${items[2].value}</text>
      </g>
      <g transform="translate(${col1X}, ${dy50})">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${escapeXml(items[3].label)}</text>
        <text x="0" y="${dy22}" font-family="Arial, sans-serif" font-size="${s16}" font-weight="bold" fill="${color}">${items[3].value}</text>
      </g>
    </g>`;
}

/* ── Stars ── */

function renderStars(
  el: CardElement,
  stats: GitHubStats | null,
  color: string,
  fontSize: number,
  sc: number,
  locale = "en",
): string {
  if (!stats) {
    return `<text x="${el.x}" y="${el.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" opacity="0.5">${translate(locale, "svg.stars.unavailable")}</text>`;
  }
  const s10 = fs(10, sc);
  const sVal = fs(26, sc);
  return `
    <g transform="translate(${el.x}, ${el.y})">
      <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${translate(locale, "svg.stars.label")}</text>
      <text x="0" y="${fs(24, sc)}" font-family="Arial, sans-serif" font-size="${sVal}" font-weight="bold" fill="${color}">${formatCount(stats.stars, locale)}</text>
    </g>`;
}

/* ── Followers ── */

function renderFollowers(
  el: CardElement,
  stats: GitHubStats | null,
  color: string,
  fontSize: number,
  sc: number,
  locale = "en",
): string {
  if (!stats) {
    return `<text x="${el.x}" y="${el.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" opacity="0.5">${translate(locale, "svg.followers.unavailable")}</text>`;
  }
  const s10 = fs(10, sc);
  const sVal = fs(24, sc);
  const labelW0 = Math.ceil(
    estimateTextWidth(translate(locale, "svg.followers.label"), s10, true),
  );
  const valW0 = Math.ceil(
    estimateTextWidth(formatCount(stats.followers, locale), sVal, true),
  );
  const col0W = Math.max(labelW0, valW0) + 4;
  const col1X = col0W + Math.round(fs(36, sc) * 1);

  return `
    <g transform="translate(${el.x}, ${el.y})">
      <g>
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${translate(locale, "svg.followers.label")}</text>
        <text x="0" y="${fs(24, sc)}" font-family="Arial, sans-serif" font-size="${sVal}" font-weight="bold" fill="${color}">${formatCount(stats.followers, locale)}</text>
      </g>
      <g transform="translate(${col1X}, 0)">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${translate(locale, "svg.followers.following")}</text>
        <text x="0" y="${fs(24, sc)}" font-family="Arial, sans-serif" font-size="${sVal}" font-weight="bold" fill="${color}">${formatCount(stats.following, locale)}</text>
      </g>
    </g>`;
}

/* ── Badge ── */

function renderBadge(el: CardElement, fontSize: number): string {
  const text = el.badgeText || "LABEL";
  const textW = estimateTextWidth(text, fontSize, true);
  const padH = 12;
  const padW = 20;
  const badgeW = Math.ceil(textW + padW);
  const badgeH = fontSize + padH;
  const centerX = badgeW / 2;
  const centerY = badgeH / 2;

  return `
    <g transform="translate(${el.x}, ${el.y})">
      <rect x="0" y="0" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${escapeXml(el.badgeColor || "#7d2ae8")}" />
      <text x="${centerX}" y="${centerY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${escapeXml(text)}</text>
    </g>`;
}

/* ── Progress bar ── */

function renderProgress(
  el: CardElement,
  color: string,
  barW: number,
  sc: number,
  locale = "en",
): string {
  const pct = Math.max(0, Math.min(100, el.progress ?? 50));
  const filledW = (pct / 100) * barW;
  const s11 = fs(11, sc);
  const barH = Math.max(4, Math.round(fs(8, sc) * 1));
  const barY = Math.round(fs(10, sc) * 1);
  return `
    <g transform="translate(${el.x}, ${el.y})">
      <text x="0" y="0" font-family="Arial, sans-serif" font-size="${s11}" font-weight="bold" fill="${color}" opacity="0.8">${escapeXml(el.progressLabel || translate(locale, "svg.progress.label"))}</text>
      <text x="${barW}" y="0" font-family="Arial, sans-serif" font-size="${s11}" font-weight="bold" fill="${color}" text-anchor="end">${pct}%</text>
      <rect x="0" y="${barY}" width="${barW}" height="${barH}" rx="${Math.round(fs(4, sc) * 1)}" fill="#30363d" />
      <rect x="0" y="${barY}" width="${filledW}" height="${barH}" rx="${Math.round(fs(4, sc) * 1)}" fill="${escapeXml(el.progressColor || "#7d2ae8")}" />
    </g>`;
}

/* ── Languages ── */

function renderLanguages(
  el: CardElement,
  stats: GitHubStats | null,
  cardW: number,
  defsParts: string[],
  sc: number,
  fontSize: number,
  locale = "en",
): string {
  const color = escapeXml(el.color || "#ffffff");
  const s10 = Math.max(fs(10, sc), Math.round(fontSize * 0.6));
  const barHeight = Math.max(4, Math.round(fs(8, sc) * 1));

  // Keep the component width independent from its position. Using el.x here
  // caused the language bar to shrink whenever it was dragged to the right.
  const autoWidth = Math.min(fs(400, sc), cardW - 64);
  const barWidth = Math.max(
    LANGUAGE_MIN_WIDTH,
    Math.min(LANGUAGE_MAX_WIDTH, Math.round(el.languageBarWidth || autoWidth)),
  );

  if (!stats) {
    const message = translate(locale, "svg.languages.unavailable");
    return `<g transform="translate(${el.x}, ${el.y})"><rect width="${barWidth}" height="${barHeight}" rx="${Math.round(fs(4, sc) * 1)}" fill="#30363d" /><text x="0" y="${Math.round(fs(28, sc) * 1)}" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.7">${message}</text></g>`;
  }
  if (stats.languages.length === 0) {
    const message = translate(locale, "svg.languages.empty");
    return `<g transform="translate(${el.x}, ${el.y})"><rect width="${barWidth}" height="${barHeight}" rx="${Math.round(fs(4, sc) * 1)}" fill="#30363d" /><text x="0" y="${Math.round(fs(28, sc) * 1)}" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.7">${message}</text></g>`;
  }

  const legendItems = getLanguageLegend(
    stats.languages,
    translate(locale, "common.other"),
    el.languageCount ?? DEFAULT_LANGUAGE_COUNT,
  );
  let currentX = 0;
  const clipId = safeSvgId("clip-bar", el.id);
  defsParts.push(
    `<clipPath id="${clipId}"><rect width="${barWidth}" height="${barHeight}" rx="${Math.round(fs(4, sc) * 1)}" /></clipPath>`,
  );

  let html = `<g transform="translate(${el.x}, ${el.y})">`;
  html += `<rect width="${barWidth}" height="${barHeight}" rx="${Math.round(fs(4, sc) * 1)}" fill="#30363d" />`;
  html += `<g clip-path="url(#${clipId})">`;
  legendItems.forEach((lang) => {
    const p = (lang.percent / 100) * barWidth;
    html += `<rect x="${currentX}" y="0" width="${p}" height="${barHeight}" fill="${escapeXml(lang.color || "#ccc")}" />`;
    currentX += p;
  });
  html += `</g>`;

  const pad = Math.round(fs(20, sc) * 1);
  const nameWidths = legendItems.map(
    (lang) =>
      Math.ceil(estimateTextWidth(`${lang.name} ${lang.percent}%`, s10, true)) +
      pad,
  );
  const gap = Math.round(fs(12, sc) * 1);
  let labelX = 0;
  let labelY = Math.round(fs(25, sc) * 1);
  const circleR = Math.max(2, Math.round(fs(4, sc) * 1));
  legendItems.forEach((lang, i) => {
    if (labelX > 0 && labelX + nameWidths[i] > barWidth) {
      labelX = 0;
      labelY += Math.round(fs(20, sc) * 1);
    }
    const lColor = escapeXml(lang.color || "#ccc");
    html += `
      <circle cx="${labelX + circleR}" cy="${labelY - circleR}" r="${circleR}" fill="${lColor}" />
      <text x="${labelX + circleR * 3 + 2}" y="${labelY}" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}">${escapeXml(lang.name)} <tspan opacity="0.58">${lang.percent}%</tspan></text>
    `;
    labelX += nameWidths[i] + gap;
  });

  html += `</g>`;
  return html;
}

/* ── Rating (SSS / SS / S / A / B / C / D) with progress ── */

const RANK_TIERS = [
  { grade: "SSS", min: 100000, color: "#ff3d00" },
  { grade: "SS", min: 50000, color: "#ff6d00" },
  { grade: "S", min: 20000, color: "#ffaa00" },
  { grade: "A", min: 10000, color: "#ffd600" },
  { grade: "B", min: 5000, color: "#00e676" },
  { grade: "C", min: 1000, color: "#2979ff" },
  { grade: "D", min: 0, color: "#757575" },
];

function calcRating(stats: GitHubStats): {
  grade: string;
  score: number;
  color: string;
  pct: number;
} {
  const r = Math.max(0, stats.totalRepos);
  const s = Math.max(0, stats.stars);
  const f = Math.max(0, stats.forks);
  const fl = Math.max(0, stats.followers);
  const c = Math.max(0, stats.totalCommits);
  const score = r + s * 10 + f * 5 + fl * 15 + c * 0.5;

  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (score >= RANK_TIERS[i].min) {
      // Progress toward next rank
      const currentMin = RANK_TIERS[i].min;
      const nextMin = i > 0 ? RANK_TIERS[i - 1].min : RANK_TIERS[0].min;
      const range = nextMin - currentMin;
      const pct = i === 0 ? 1 : Math.min(1, (score - currentMin) / range);
      return { ...RANK_TIERS[i], score, pct };
    }
  }
  return { grade: "D", score, color: "#757575", pct: 0 };
}

function renderRating(
  el: CardElement,
  stats: GitHubStats | null,
  color: string,
  fontSize: number,
  sc: number,
  locale = "en",
): string {
  if (!stats || stats.totalRepos < 0) {
    return `<text x="${el.x}" y="${el.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" opacity="0.5">${translate(locale, "svg.rating.unavailable")}</text>`;
  }
  const { grade, color: gradeColorRaw, pct } = calcRating(stats);
  const gradeColor = escapeXml(gradeColorRaw);
  const r = Math.round;

  // Scale everything from fontSize (SIZE property) — 16px baseline
  const scale = fontSize / 16;
  const textSize = Math.max(r(fs(22, sc)), fontSize);
  const estW = estimateTextWidth(grade, textSize, true);
  const ringWidth = r(fs(6, sc) * scale);
  const diam = r(Math.max(estW + r(fs(28, sc) * scale), r(fs(64, sc) * scale)));
  const radius = diam / 2 - ringWidth;
  const cx = diam / 2;
  const cy = diam / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, pct)));
  const glowId = safeSvgId("glow", el.id);

  return `<g transform="translate(${el.x}, ${el.y})">
      <defs>
        <filter id="${glowId}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${r(fs(1.5, sc))}" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Inner filled circle -->
      <circle cx="${cx}" cy="${cy}" r="${radius - ringWidth / 2}" fill="${color}" opacity="0.06" />

      <!-- Background ring (track) -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
        stroke="${color}" stroke-width="${ringWidth}" opacity="0.12" />

      <!-- Progress ring (from 3h clockwise) -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
        stroke="${gradeColor}" stroke-width="${ringWidth}" opacity="0.85"
        stroke-linecap="round"
        stroke-dasharray="${circumference} ${circumference}"
        stroke-dashoffset="${dashOffset}" />

      <!-- Center grade letter with glow -->
      <text x="${cx}" y="${cy}" font-family="Arial, sans-serif" font-size="${textSize}" font-weight="bold" fill="${gradeColor}" text-anchor="middle" dominant-baseline="central" filter="url(#${glowId})" opacity="0.9">${grade}</text>
    </g>`;
}

/* ── Contribution heatmap ── */

function renderContributions(
  el: CardElement,
  stats: GitHubStats | null,
  cardW: number,
  sc: number,
  locale = "en",
): string {
  const color = escapeXml(el.color || "#ffffff");
  const s10 = fs(10, sc);

  if (
    !stats ||
    !stats.contributionDays ||
    stats.contributionDays.length === 0
  ) {
    return `<text x="${el.x}" y="${el.y}" font-family="Arial, sans-serif" font-size="${fs(12, sc)}" font-weight="bold" fill="${color}" opacity="0.5">${translate(locale, "svg.contributions.unavailable")}</text>`;
  }

  const days = stats.contributionDays;
  const cellSize = Math.max(2, Math.round(fs(8, sc) * 1));
  const cellGap = Math.max(1, Math.round(fs(2, sc) * 1));
  const rows = 7;
  const maxCols = Math.min(
    31,
    Math.floor((cardW - el.x - 30) / (cellSize + cellGap)),
  );
  const cols = maxCols;

  const startIdx = Math.max(0, days.length - cols * rows);
  const visibleDays = days.slice(startIdx);

  let html = `<g transform="translate(${el.x}, ${el.y})">`;
  html += `<text x="0" y="${-fs(6, sc)}" font-family="Arial, sans-serif" font-size="${s10}" font-weight="bold" fill="${color}" opacity="0.6">${translate(locale, "svg.contributions.label")} (${stats.totalCommits >= 0 ? formatCount(stats.totalCommits, locale) : "N/A"} ${translate(locale, "svg.contributions.thisYear")})</text>`;

  visibleDays.forEach((day, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const cx = col * (cellSize + cellGap);
    const cy = row * (cellSize + cellGap) + fs(6, sc);

    const intensity =
      day.count === 0
        ? 0
        : day.count <= 1
          ? 1
          : day.count <= 3
            ? 2
            : day.count <= 6
              ? 3
              : 4;

    const fillColors = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
    html += `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" rx="${fs(2, sc)}" fill="${fillColors[intensity]}" />`;
  });

  html += `</g>`;
  return html;
}

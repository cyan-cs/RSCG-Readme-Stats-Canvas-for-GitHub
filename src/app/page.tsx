"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  CardElement,
  CardConfig,
  ElementType,
  ShapeType,
  DEFAULT_LANGUAGE_COUNT,
  MAX_LANGUAGE_COUNT,
  LANGUAGE_MAX_WIDTH,
  LANGUAGE_MIN_WIDTH,
  estimateTextWidth,
  generateSVG,
  getLanguageLegend,
} from "@/lib/svg-engine";
import type { GitHubStats } from "@/lib/github-api";
import { cardConfigSchema, cardElementSchema } from "@/lib/validation";
import { buildLinkedCardMarkdown } from "@/lib/embed-code";
import {
  translate,
  type TranslationKey,
  resolveLocale,
  type Locale,
} from "@/i18n";
import {
  Undo2,
  Redo2,
  Type,
  BarChart3,
  Trash2,
  Rocket,
  MousePointer2,
  Copy,
  Check,
  LogOut,
  Monitor,
  GitBranch,
  User,
  Award,
  Ruler,
  Download,
  Keyboard,
  Lock,
  LockOpen,
  BringToFront,
  SendToBack,
  X,
  LayoutTemplate,
  Share2,
  Plus,
  Pencil,
  Bookmark,
  Square,
  MoreHorizontal,
  Link2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface SavedCard {
  name: string;
  config: CardConfig;
  shareId?: string;
}

type DrawerType =
  | "templates"
  | "saved"
  | "text"
  | "decoration"
  | "data"
  | "widgets";
type DecorationTab = "line" | "shape";
type SizeMode = "auto" | "manual";
type ShapeDrawingState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  shapeType: ShapeType;
  phase?: "drawing" | "waiting";
};

const HISTORY_LIMIT = 100;
const CARD_PADDING = 16;

function getElementExtent(element: CardElement): {
  right: number;
  bottom: number;
} {
  const fontSize = element.fontSize || 16;

  if (element.type === "line") {
    const x2 =
      element.x2 ?? element.x + Math.max(0, element.lineWidth || 152);
    const y2 = element.y2 ?? element.y + (element.lineHeight || 0);
    return {
      right: Math.max(element.x, x2) + (element.lineStrokeWidth || 2),
      bottom: Math.max(element.y, y2) + (element.lineStrokeWidth || 2),
    };
  }
  if (element.type === "shape") {
    return {
      right: element.x + (element.shapeWidth || 96),
      bottom: element.y + (element.shapeHeight || 64),
    };
  }
  if (element.type === "text") {
    const width = estimateTextWidth(element.text || "", fontSize, true);
    const left =
      element.textAlign === "center"
        ? element.x - width / 2
        : element.textAlign === "right"
          ? element.x - width
          : element.x;
    return { right: left + width, bottom: element.y + 4 };
  }

  const sizeByType: Partial<Record<ElementType, [number, number]>> = {
    stats: [300, 110],
    languages: [element.languageBarWidth || 320, 80],
    avatar: [Math.max(64, fontSize * 4), Math.max(64, fontSize * 4)],
    stars: [180, 40],
    followers: [180, 40],
    contributions: [300, 90],
    badge: [
      estimateTextWidth(element.badgeText || "LABEL", fontSize, true) + 24,
      fontSize + 16,
    ],
    progress: [element.progressBarWidth || 160, 32],
    calendar: [220, 30],
    rating: [Math.max(72, fontSize * 4), Math.max(72, fontSize * 4)],
  };
  const [width, height] = sizeByType[element.type] || [80, 40];
  return {
    right: element.x + width,
    bottom: element.y + height,
  };
}

function calculateAutoCardSize(elements: CardElement[]): {
  width: number;
  height: number;
} {
  const visibleElements = elements.filter((element) => element.visible);
  if (visibleElements.length === 0) return { width: 100, height: 100 };

  const extent = visibleElements.reduce(
    (result, element) => {
      const next = getElementExtent(element);
      return {
        right: Math.max(result.right, next.right),
        bottom: Math.max(result.bottom, next.bottom),
      };
    },
    { right: 0, bottom: 0 },
  );
  return {
    width: Math.min(1200, Math.max(100, Math.ceil(extent.right + CARD_PADDING))),
    height: Math.min(800, Math.max(50, Math.ceil(extent.bottom + CARD_PADDING))),
  };
}

const SHAPE_PRESETS: Array<{
  type: ShapeType;
  label: TranslationKey;
  width: number;
  height: number;
  radius?: number;
}> = [
  {
    type: "rectangle",
    label: "shape.rectangle",
    width: 96,
    height: 64,
    radius: 0,
  },
  {
    type: "rounded-rectangle",
    label: "shape.roundedRectangle",
    width: 96,
    height: 64,
    radius: 12,
  },
  { type: "circle", label: "shape.circle", width: 72, height: 72 },
  { type: "ellipse", label: "shape.ellipse", width: 104, height: 64 },
  { type: "triangle", label: "shape.triangle", width: 88, height: 72 },
  { type: "diamond", label: "shape.diamond", width: 80, height: 80 },
  { type: "arrow", label: "shape.arrow", width: 112, height: 56 },
  { type: "star", label: "shape.star", width: 80, height: 80 },
  { type: "hexagon", label: "shape.hexagon", width: 88, height: 72 },
  {
    type: "speech-bubble",
    label: "shape.speechBubble",
    width: 112,
    height: 80,
    radius: 10,
  },
];

const DATA_TOOLS: Array<{ type: ElementType; label: TranslationKey }> = [
  { type: "stats", label: "element.stats.short" },
  { type: "languages", label: "element.languages.short" },
  { type: "stars", label: "element.stars.short" },
  { type: "followers", label: "element.followers.short" },
  { type: "contributions", label: "element.contributions.short" },
  { type: "rating", label: "element.rating.short" },
];

const WIDGET_TOOLS: Array<{ type: ElementType; label: TranslationKey }> = [
  { type: "badge", label: "element.badge.short" },
  { type: "progress", label: "element.progress.short" },
  { type: "calendar", label: "element.calendar.short" },
];

const LINE_STYLE_PRESETS: NonNullable<CardElement["lineStyle"]>[] = [
  "solid",
  "dotted",
  "wavy",
  "double",
  "dash-dot",
  "double-dot",
  "dashed",
  "zigzag",
];

const LINE_STYLE_LABELS: Record<
  NonNullable<CardElement["lineStyle"]>,
  TranslationKey
> = {
  solid: "lineStyle.solid",
  dotted: "lineStyle.dotted",
  wavy: "lineStyle.wavy",
  double: "lineStyle.double",
  "dash-dot": "lineStyle.dashDot",
  "double-dot": "lineStyle.doubleDot",
  dashed: "lineStyle.dashed",
  zigzag: "lineStyle.zigzag",
};

const ELEMENT_NAME_KEYS: Record<ElementType, TranslationKey> = {
  text: "element.text.name",
  stats: "element.stats.name",
  languages: "element.languages.name",
  avatar: "element.avatar.name",
  line: "element.line.name",
  shape: "element.shape.name",
  stars: "element.stars.name",
  followers: "element.followers.name",
  contributions: "element.contributions.name",
  badge: "element.badge.name",
  progress: "element.progress.name",
  calendar: "element.calendar.name",
  rating: "element.rating.name",
};

const LINE_COLOR_NAMES: Record<string, string> = {
  "#ffffff": "white",
  "#58a6ff": "blue",
  "#e3b341": "yellow",
  "#e94560": "red",
  "#7d2ae8": "purple",
  "#26a641": "green",
  "#f78166": "orange",
  "#8b949e": "gray",
  "#000000": "black",
};

function constrainShapePoint(
  drawing: Pick<ShapeDrawingState, "startX" | "startY" | "shapeType">,
  targetX: number,
  targetY: number,
  preserveRatio: boolean,
): { x: number; y: number } {
  if (drawing.shapeType !== "circle" && !preserveRatio) {
    return { x: targetX, y: targetY };
  }

  const preset =
    SHAPE_PRESETS.find((item) => item.type === drawing.shapeType) ||
    SHAPE_PRESETS[0];
  const ratio =
    drawing.shapeType === "circle" ? 1 : preset.width / preset.height;
  const dx = targetX - drawing.startX;
  const dy = targetY - drawing.startY;
  const width = Math.max(Math.abs(dx), Math.abs(dy) * ratio);
  const height = width / ratio;
  return {
    x: drawing.startX + Math.sign(dx || 1) * width,
    y: drawing.startY + Math.sign(dy || 1) * height,
  };
}

function renderShapeDrawingPreview(
  shapeType: ShapeType,
  fill: string,
  stroke: string,
  strokeWidth: number,
) {
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeLinejoin: "round" as const,
  };
  if (shapeType === "circle")
    return <circle cx="24" cy="24" r="24" {...common} />;
  if (shapeType === "ellipse")
    return <ellipse cx="24" cy="24" rx="24" ry="24" {...common} />;
  if (shapeType === "triangle")
    return <polygon points="24,0 48,48 0,48" {...common} />;
  if (shapeType === "diamond")
    return <polygon points="24,0 48,24 24,48 0,24" {...common} />;
  if (shapeType === "arrow")
    return (
      <polygon
        points="0,13.44 27.84,13.44 27.84,0 48,24 27.84,48 27.84,34.56 0,34.56"
        {...common}
      />
    );
  if (shapeType === "star")
    return (
      <polygon
        points="24,0 29.64,16.24 47,16.72 33.24,27.28 38.36,44 24,34.56 9.64,44 14.76,27.28 1,16.72 18.36,16.24"
        {...common}
      />
    );
  if (shapeType === "hexagon")
    return (
      <polygon
        points="48,24 36,44.78 12,44.78 0,24 12,3.22 36,3.22"
        {...common}
      />
    );
  if (shapeType === "speech-bubble")
    return (
      <path
        d="M5 0h38a5 5 0 0 1 5 5v29.56a5 5 0 0 1-5 5H23.04L14.4 48l.96-8.44H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z"
        {...common}
      />
    );
  return (
    <rect
      width="48"
      height="48"
      rx={shapeType === "rounded-rectangle" ? 8 : 0}
      {...common}
    />
  );
}

export default function EditorPage() {
  const { data: session, status } = useSession();
  const defaultConfig: CardConfig = {
    username: "...",
    bgColor: "#0d1117",
    borderColor: "#30363d",
    width: 380,
    height: 158,
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

  const [cardName, setCardName] = useState(() => {
    try {
      return localStorage.getItem("rscg-card-name") || "";
    } catch {
      return "";
    }
  });
  const [savedCards, setSavedCards] = useState<SavedCard[]>(() => {
    try {
      const raw = localStorage.getItem("rscg-saved-cards");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item): SavedCard[] => {
        if (!item || typeof item.name !== "string") return [];
        const shareId =
          typeof item.shareId === "string" &&
          /^[A-Za-z0-9_-]{22}$/.test(item.shareId)
            ? item.shareId
            : undefined;
        const result = cardConfigSchema.safeParse(item.config);
        return result.success
          ? [
              {
                name: item.name.slice(0, 200),
                config: result.data,
                shareId,
              },
            ]
          : [];
      });
    } catch {
      return [];
    }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [promptModal, setPromptModal] = useState<{
    message: string;
    defaultValue: string;
    onConfirm: (v: string) => void;
  } | null>(null);
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem("rscg-config");
      if (saved) {
        const parsed = cardConfigSchema.safeParse(JSON.parse(saved));
        if (parsed.success) return parsed.data;
      }
    } catch {}
    return defaultConfig;
  };
  const [config, setConfig] = useState<CardConfig>(loadFromStorage);

  const [history, setHistory] = useState<CardConfig[]>([]);
  const [redoStack, setRedoStack] = useState<CardConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Mock stats for SVG preview in editor
  const mockStats: GitHubStats = React.useMemo(
    () => ({
      totalRepos: 42,
      totalCommits: 1248,
      weeklyCommits: 12,
      dailyCommits: 4,
      stars: 156,
      forks: 15,
      followers: 89,
      following: 32,
      avatarUrl: "",
      languages: [
        { name: "TypeScript", color: "#3178c6", size: 65000 },
        { name: "JavaScript", color: "#f1e05a", size: 35000 },
      ],
      contributionDays: [],
    }),
    [],
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; text: string; type: "error" | "success" }[]
  >([]);
  const toastId = useRef(0);
  const showToast = (text: string, type: "error" | "success" = "error") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<
    "start" | "end" | null
  >(null);
  const draggingEndpointRef = useRef<"start" | "end" | null>(null);
  const [resizing, setResizing] = useState<boolean>(false);
  const [elementResizingId, setElementResizingId] = useState<string | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isRectSelecting, setIsRectSelecting] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [rectCurrent, setRectCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<CardElement[]>([]);
  const hasLoadedInitial = useRef(false);
  const shiftRef = useRef(false);
  const getCanvasPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.offsetWidth || 1;
      const scaleY = rect.height / canvas.offsetHeight || 1;
      return {
        x: (clientX - rect.left) / scaleX,
        y: (clientY - rect.top) / scaleY,
      };
    },
    [],
  );

  // UI state
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [snapTo8px, setSnapTo8px] = useState(true);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [widthMode, setWidthMode] = useState<SizeMode>(() => {
    try {
      return localStorage.getItem("rscg-width-mode") === "auto"
        ? "auto"
        : "manual";
    } catch {
      return "manual";
    }
  });
  const [heightMode, setHeightMode] = useState<SizeMode>(() => {
    try {
      return localStorage.getItem("rscg-height-mode") === "manual"
        ? "manual"
        : "auto";
    } catch {
      return "auto";
    }
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [customShareMessage, setCustomShareMessage] = useState<string | null>(
    null,
  );
  const [activeDrawer, setActiveDrawer] = useState<DrawerType | null>(null);
  const [decorationTab, setDecorationTab] = useState<DecorationTab>("line");
  const showTemplates = activeDrawer === "templates";
  const showSavedDrawer = activeDrawer === "saved";
  const showTextDrawer = activeDrawer === "text";
  const showLineDrawer = activeDrawer === "decoration";
  const showDataDrawer = activeDrawer === "data";
  const showWidgetDrawer = activeDrawer === "widgets";
  const setShowTemplates = (show: boolean) =>
    setActiveDrawer(show ? "templates" : null);
  const setShowSavedDrawer = (show: boolean) =>
    setActiveDrawer(show ? "saved" : null);
  const setShowLineDrawer = (show: boolean) =>
    setActiveDrawer(show ? "decoration" : null);
  const [lineColor, setLineColor] = useState("#ffffff");
  const [lineThickness, setLineThickness] = useState(2);
  const [lineStylePreset, setLineStylePreset] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(18);
  const [selectedShapeType, setSelectedShapeType] =
    useState<ShapeType>("rectangle");
  const [shapeFillColor, setShapeFillColor] = useState("#7d2ae8");
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#ffffff");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);
  const [shapeWidth, setShapeWidth] = useState(96);
  const [shapeHeight, setShapeHeight] = useState(64);
  const [previewBgColor, setPreviewBgColor] = useState("#0d1117");
  const [previewTextColor, setPreviewTextColor] = useState("#ffffff");
  const [showCustomBg, setShowCustomBg] = useState(false);
  const [showCustomText, setShowCustomText] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [customBgHex, setCustomBgHex] = useState("#000000");
  const [customTextHex, setCustomTextHex] = useState("#000000");
  const [realStats, setRealStats] = useState<GitHubStats | null>(null);
  const [placingType, setPlacingType] = useState<ElementType | null>(null);
  const [lineDrawing, setLineDrawing] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    phase?: "drawing" | "waiting";
  } | null>(null);
  const [shapeDrawing, setShapeDrawing] = useState<ShapeDrawingState | null>(
    null,
  );

  const displayStats = React.useMemo(
    () => realStats || mockStats,
    [realStats, mockStats],
  );

  const detectedLocale = React.useMemo(() => {
    const loc = session?.user?.location;
    if (!loc) return null;
    const lower = loc.toLowerCase();
    if (lower.includes("japan") || lower.includes("日本") || lower === "jp")
      return "ja";
    if (lower.includes("korea") || lower.includes("한국") || lower === "kr")
      return "ko";
    if (lower.includes("china") || lower.includes("中国") || lower === "cn")
      return "zh";
    return null;
  }, [session?.user?.location]);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [userLocale, setUserLocale] = useState<Locale | null>(null); // null = auto-detect
  const [browserLocale, setBrowserLocale] = useState<Locale>("en");

  const locale = React.useMemo(() => {
    if (userLocale) return userLocale;
    if (detectedLocale) return detectedLocale;
    return browserLocale;
  }, [userLocale, detectedLocale, browserLocale]);

  const t = React.useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale],
  );
  const shareMessage =
    customShareMessage ?? translate(locale, "share.defaultMessage");

  const toggleDrawer = (drawer: DrawerType) => {
    const nextDrawer = activeDrawer === drawer ? null : drawer;
    setActiveDrawer(nextDrawer);
    setSelectedIds([]);
    setEditingId(null);
    setPlacingType(null);
    setLineDrawing(null);
    setShapeDrawing(null);
  };

  const toggleDecorationDrawer = (tab: DecorationTab) => {
    const shouldClose = activeDrawer === "decoration" && decorationTab === tab;
    setDecorationTab(tab);
    setActiveDrawer(shouldClose ? null : "decoration");
    setSelectedIds([]);
    setEditingId(null);
    setPlacingType(null);
    setLineDrawing(null);
    setShapeDrawing(null);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const previewSvg = React.useMemo(
    () => generateSVG(config, displayStats, locale),
    [config, displayStats, locale],
  );

  const elementPreviewSvgs = React.useMemo(() => {
    const contributionDays = displayStats.contributionDays?.length
      ? displayStats.contributionDays
      : Array.from({ length: 70 }, (_, index) => ({
          date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
          count: [0, 1, 2, 4, 7][(index * 7 + index * index) % 5],
        }));
    const previewStats = { ...displayStats, contributionDays };
    const previews = {} as Record<ElementType, string>;
    const previewElements: Partial<Record<ElementType, CardElement>> = {
      stats: {
        id: "preview-stats",
        type: "stats",
        x: 14,
        y: 22,
        fontSize: 16,
        color: "#ffffff",
        visible: true,
      },
      languages: {
        id: "preview-languages",
        type: "languages",
        x: 14,
        y: 24,
        fontSize: 14,
        color: "#ffffff",
        visible: true,
        languageBarWidth: 210,
      },
      stars: {
        id: "preview-stars",
        type: "stars",
        x: 16,
        y: 34,
        fontSize: 16,
        color: "#ffffff",
        visible: true,
      },
      followers: {
        id: "preview-followers",
        type: "followers",
        x: 16,
        y: 34,
        fontSize: 16,
        color: "#ffffff",
        visible: true,
      },
      contributions: {
        id: "preview-contributions",
        type: "contributions",
        x: 14,
        y: 34,
        fontSize: 14,
        color: "#ffffff",
        visible: true,
      },
      rating: {
        id: "preview-rating",
        type: "rating",
        x: 14,
        y: 12,
        fontSize: 16,
        color: "#ffffff",
        visible: true,
      },
      badge: {
        id: "preview-badge",
        type: "badge",
        x: 18,
        y: 48,
        fontSize: 16,
        color: "#ffffff",
        visible: true,
        badgeText: "PRO",
        badgeColor: "#7d2ae8",
      },
      progress: {
        id: "preview-progress",
        type: "progress",
        x: 16,
        y: 38,
        fontSize: 14,
        color: "#ffffff",
        visible: true,
        progress: 65,
        progressLabel: t("defaults.completion"),
        progressColor: "#26a641",
        progressBarWidth: 190,
      },
      calendar: {
        id: "preview-calendar",
        type: "calendar",
        x: 16,
        y: 62,
        fontSize: 15,
        color: "#ffffff",
        visible: true,
        calendarFormat: "both",
      },
    };
    [...DATA_TOOLS, ...WIDGET_TOOLS].forEach(({ type }) => {
      const element = previewElements[type];
      if (!element) return;
      previews[type] = generateSVG(
        {
          username: "preview",
          bgColor: "#0d1117",
          borderColor: "#30363d",
          width: 240,
          height: 120,
          elements: [element],
        },
        previewStats,
        locale,
      );
    });
    return previews;
  }, [displayStats, locale, t]);

  const shapePreviewSvgs = React.useMemo(
    () =>
      Object.fromEntries(
        SHAPE_PRESETS.map((preset) => {
          const isSelected = preset.type === selectedShapeType;
          const previewWidth = isSelected ? shapeWidth : preset.width;
          const previewHeight = isSelected ? shapeHeight : preset.height;
          const padding = 16;
          const svg = generateSVG(
            {
              username: "preview",
              bgColor: "transparent",
              borderColor: "transparent",
              width: previewWidth + padding * 2,
              height: previewHeight + padding * 2,
              elements: [
                {
                  id: `preview-${preset.type}`,
                  type: "shape",
                  x: padding,
                  y: padding,
                  visible: true,
                  color: shapeFillColor,
                  shapeType: preset.type,
                  shapeWidth: previewWidth,
                  shapeHeight: previewHeight,
                  shapeStrokeColor,
                  shapeStrokeWidth,
                  shapeRadius: preset.radius,
                },
              ],
            },
            null,
            locale,
          );
          return [preset.type, svg];
        }),
      ) as Record<ShapeType, string>,
    [
      locale,
      selectedShapeType,
      shapeFillColor,
      shapeHeight,
      shapeStrokeColor,
      shapeStrokeWidth,
      shapeWidth,
    ],
  );

  const textPreviewSvg = React.useMemo(
    () =>
      generateSVG(
        {
          username: "preview",
          bgColor: "transparent",
          borderColor: "transparent",
          width: 224,
          height: 80,
          elements: [
            {
              id: "preview-text",
              type: "text",
              x: 12,
              y: 48,
              text: textDraft.trim() || t("defaults.newText"),
              fontSize: textSize,
              visible: true,
              color: textColor,
            },
          ],
        },
        null,
        locale,
      ),
    [locale, t, textColor, textDraft, textSize],
  );

  // Template list
  const [templates] = useState<string[]>([
    "default",
    "activity",
    "profile",
    "minimal",
    "contributions",
    "devfull",
    "ranking",
  ]);

  const [templatePreviews, setTemplatePreviews] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    templates.forEach(async (name) => {
      try {
        const resp = await fetch(`/templates/${name}.json`);
        const data = await resp.json();
        if (data.elements) {
          const cfg = {
            ...data,
            bgColor: previewBgColor,
            elements: data.elements.map((el: CardElement) => ({
              ...el,
              color: el.color ? previewTextColor : el.color,
            })),
          };
          const svg = generateSVG(cfg, displayStats, locale);
          setTemplatePreviews((prev) => ({ ...prev, [name]: svg }));
        }
      } catch {}
    });
  }, [templates, previewBgColor, previewTextColor, displayStats, locale]);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
  }, [status]);

  // Set mounted state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setBrowserLocale(resolveLocale(navigator.language));
  }, []);

  // Set username and load existing config when session is available
  useEffect(() => {
    const user = session?.user;
    if (
      status === "authenticated" &&
      user?.username &&
      !hasLoadedInitial.current
    ) {
      hasLoadedInitial.current = true;
      const username = user.username;
      setConfig((prev) => ({ ...prev, username }));

      const startTime = Date.now();

      // Load existing config + stats in parallel before showing editor
      Promise.all([
        fetch(`/${username}?raw=true`)
          .then(async (res) => {
            if (res.ok) {
              const lastConfig = cardConfigSchema.safeParse(await res.json());
              if (lastConfig.success) setConfig(lastConfig.data);
            }
          })
          .catch(() => {}),
        fetch("/api/stats")
          .then(async (res) => {
            if (res.ok) {
              const stats = await res.json();
              setRealStats(stats);
            }
          })
          .catch(() => {}),
      ]).finally(() => {
        const elapsed = Date.now() - startTime;
        setTimeout(() => setIsInitialized(true), Math.max(0, 500 - elapsed));
      });
    }
  }, [session, status]);

  // z-order
  const bringToFront = () => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setConfig((prev) => {
      const moved = prev.elements.filter((el) => selectedIds.includes(el.id));
      const rest = prev.elements.filter((el) => !selectedIds.includes(el.id));
      return { ...prev, elements: [...rest, ...moved] };
    });
  };
  const sendToBack = () => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setConfig((prev) => {
      const moved = prev.elements.filter((el) => selectedIds.includes(el.id));
      const rest = prev.elements.filter((el) => !selectedIds.includes(el.id));
      return { ...prev, elements: [...moved, ...rest] };
    });
  };

  // Lock / unlock
  const toggleLock = () => {
    if (selectedIds.length === 0) return;
    const allLocked = selectedIds.every(
      (id) => config.elements.find((el) => el.id === id)?.locked,
    );
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, locked: !allLocked } : el,
      ),
    }));
  };

  // Import / Export
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profilecanvas-${config.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importConfig = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          const parsed = cardConfigSchema.safeParse({
            ...imported,
            username: config.username,
          });
          if (parsed.success) {
            saveToHistory();
            setConfig(parsed.data);
            setHistory([]);
            setRedoStack([]);
            setSelectedIds([]);
          } else {
            showToast(t("errors.invalidJson"));
          }
        } catch {
          showToast(t("errors.invalidJson"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const saveAsTemplate = () => {
    setPromptModal({
      message: t("editor.saved.templateName"),
      defaultValue: cardName || "",
      onConfirm: (name) => {
        const normalizedName = name.trim();
        if (!normalizedName) return;
        const savedCard: SavedCard = {
          name: normalizedName.slice(0, 200),
          config: structuredClone(config),
        };
        setSavedCards((prev) => {
          const existingIndex = prev.findIndex(
            (card) => !card.shareId && card.name === savedCard.name,
          );
          const updated =
            existingIndex >= 0
              ? prev.map((card, index) =>
                  index === existingIndex ? savedCard : card,
                )
              : [...prev, savedCard];
          try {
            localStorage.setItem("rscg-saved-cards", JSON.stringify(updated));
          } catch {
            showToast(t("errors.saveTemplate"));
            return prev;
          }
          return updated;
        });
        showToast(`${t("status.saved")} "${savedCard.name}"`, "success");
      },
    });
  };

  const loadTemplate = (name: string) => {
    fetch(`/templates/${name}.json`)
      .then(async (res) => {
        if (!res.ok) throw new Error(t("errors.loadTemplate"));
        const data = await res.json();
        const parsed = cardConfigSchema.safeParse({
          ...data,
          username: config.username,
          bgColor: previewBgColor,
          elements: (data.elements as CardElement[]).map((el: CardElement) => ({
            ...el,
            color: el.color ? previewTextColor : el.color,
          })),
        });
        if (!parsed.success) throw new Error(t("errors.invalidJson"));
        const cfg: CardConfig = parsed.data;
        saveToHistory();
        setConfig((prev) => ({ ...prev, ...cfg }));
        setSelectedIds([]);
      })
      .catch((err) => showToast(err.message || t("errors.loadTemplate")));
  };

  const saveToHistory = React.useCallback(() => {
    setHistory((prev) =>
      [...prev, structuredClone(config)].slice(-HISTORY_LIMIT),
    );
    setRedoStack([]);
  }, [config]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((prevStack) =>
      [...prevStack, structuredClone(config)].slice(-HISTORY_LIMIT),
    );
    setHistory((prevHistory) => prevHistory.slice(0, -1));
    setConfig(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prevHistory) =>
      [...prevHistory, structuredClone(config)].slice(-HISTORY_LIMIT),
    );
    setRedoStack((prevStack) => prevStack.slice(0, -1));
    setConfig(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      }
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        saveToHistory();
        setConfig((prev) => ({
          ...prev,
          elements: prev.elements.filter((el) => !selectedIds.includes(el.id)),
        }));
        setSelectedIds([]);
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        const amount = (snapTo8px ? 8 : 1) * (e.shiftKey ? 4 : 1);
        const dx =
          e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
        const dy =
          e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
        saveToHistory();
        setConfig((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            selectedIds.includes(el.id) && !el.locked
              ? {
                  ...el,
                  x: el.x + dx,
                  y: el.y + dy,
                  x2:
                    el.type === "line" && el.x2 !== undefined
                      ? el.x2 + dx
                      : el.x2,
                  y2:
                    el.type === "line" && el.y2 !== undefined
                      ? el.y2 + dy
                      : el.y2,
                }
              : el,
          ),
        }));
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedIds(config.elements.map((el) => el.id));
      }
      if (
        (e.key === "c" || e.key === "C") &&
        (e.ctrlKey || e.metaKey) &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        clipboardRef.current = config.elements
          .filter((el) => selectedIds.includes(el.id))
          .map((el) => ({ ...el }));
      }
      if (
        (e.key === "v" || e.key === "V") &&
        (e.ctrlKey || e.metaKey) &&
        clipboardRef.current.length > 0
      ) {
        e.preventDefault();
        saveToHistory();
        const offset = 12;
        const newElements = clipboardRef.current.map((el) => ({
          ...el,
          id: Math.random().toString(36).substr(2, 9),
          x: el.x + offset,
          y: el.y + offset,
        }));
        setConfig((prev) => ({
          ...prev,
          elements: [...prev.elements, ...newElements],
        }));
        setSelectedIds(newElements.map((el) => el.id));
      }
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        try {
          localStorage.setItem("rscg-config", JSON.stringify(config));
          showToast(t("status.saved"), "success");
        } catch {
          showToast(t("errors.saveTemplate"));
        }
      }
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowShareModal(false);
        setShowPublishModal(false);
        setShowPublishOptions(false);
        setShowSizeMenu(false);
        setShowLangMenu(false);
        setShowSaveModal(false);
        setConfirmModal(null);
        setActiveDrawer(null);
        setPlacingType(null);
        setLineDrawing(null);
        setShapeDrawing(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedIds,
    config,
    history,
    redoStack,
    undo,
    redo,
    showToast,
    snapTo8px,
    t,
  ]);

  // Auto-save config to localStorage on every change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem("rscg-config", JSON.stringify(config));
    } catch {}
  }, [config, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const autoSize = calculateAutoCardSize(config.elements);
    const frame = requestAnimationFrame(() => {
      setConfig((current) => {
        const width = widthMode === "auto" ? autoSize.width : current.width;
        const height = heightMode === "auto" ? autoSize.height : current.height;
        return width === current.width && height === current.height
          ? current
          : { ...current, width, height };
      });
    });
    try {
      localStorage.setItem("rscg-width-mode", widthMode);
      localStorage.setItem("rscg-height-mode", heightMode);
    } catch {}
    return () => cancelAnimationFrame(frame);
  }, [config.elements, heightMode, isInitialized, widthMode]);

  // Load shared template from ?template= URL parameter
  const templateLoadedRef = useRef(false);
  useEffect(() => {
    if (!isInitialized || templateLoadedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const templateHash = params.get("template");
    if (!templateHash) return;
    templateLoadedRef.current = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/share?template=${encodeURIComponent(templateHash)}`,
        );
        if (!res.ok) return;
        const parsedTemplate = cardConfigSchema.safeParse(await res.json());
        if (!parsedTemplate.success) return;
        const templateConfig = parsedTemplate.data;
        // Save to saved cards — don't auto-apply, let user choose
        const now = new Date();
        const autoName = `Shared ${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setSavedCards((prev: SavedCard[]) => {
          if (prev.some((card) => card.shareId === templateHash)) return prev;
          const updated = [
            ...prev,
            {
              name: autoName,
              config: { ...templateConfig },
              shareId: templateHash,
            },
          ];
          try {
            localStorage.setItem("rscg-saved-cards", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setShowSavedDrawer(true);
        showToast(t("status.sharedTemplateSaved"), "success");
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      } catch {}
    })();
  }, [isInitialized, t]);

  // Shift key state for constrained line drawing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useLayoutEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Line drawing preview
      if (lineDrawing && canvasRef.current) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        let rawX = point.x;
        let rawY = point.y;
        if (shiftRef.current) {
          const dx = rawX - lineDrawing.startX;
          const dy = rawY - lineDrawing.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const angle = Math.atan2(dy, dx);
            const snappedAngle =
              Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            rawX = lineDrawing.startX + dist * Math.cos(snappedAngle);
            rawY = lineDrawing.startY + dist * Math.sin(snappedAngle);
          }
        }
        if (snapTo8px) {
          rawX = Math.round(rawX / 8) * 8;
          rawY = Math.round(rawY / 8) * 8;
        }
        setLineDrawing((prev) =>
          prev ? { ...prev, currentX: rawX, currentY: rawY } : null,
        );
        return;
      }
      if (shapeDrawing && canvasRef.current) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        let rawX = point.x;
        let rawY = point.y;
        const constrained = constrainShapePoint(
          shapeDrawing,
          rawX,
          rawY,
          shiftRef.current,
        );
        rawX = constrained.x;
        rawY = constrained.y;
        if (snapTo8px) {
          rawX = Math.round(rawX / 8) * 8;
          rawY = Math.round(rawY / 8) * 8;
        }
        setShapeDrawing((prev) =>
          prev ? { ...prev, currentX: rawX, currentY: rawY } : null,
        );
        return;
      }
      if (resizing && canvasRef.current) {
        // We no longer manually resize height via drag, but we keep the state check if needed for other things
        return;
      }
      if (elementResizingId && canvasRef.current) {
        const el = config.elements.find(
          (item) => item.id === elementResizingId,
        );
        if (!el) return;
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        const mouseX = point.x;
        if (el.type === "languages" || el.type === "progress") {
          const minWidth = el.type === "languages" ? LANGUAGE_MIN_WIDTH : 40;
          const maxWidth = el.type === "languages" ? LANGUAGE_MAX_WIDTH : 1200;
          const rawWidth = Math.max(
            minWidth,
            Math.min(maxWidth, Math.round(mouseX - el.x)),
          );
          const newWidth = snapTo8px
            ? Math.max(
                minWidth,
                Math.min(maxWidth, Math.round(rawWidth / 8) * 8),
              )
            : rawWidth;
          setConfig((prev) => ({
            ...prev,
            elements: prev.elements.map((item) =>
              item.id === elementResizingId
                ? el.type === "languages"
                  ? { ...item, languageBarWidth: newWidth }
                  : { ...item, progressBarWidth: newWidth }
                : item,
            ),
          }));
          return;
        }
        if (el.type === "shape") {
          const mouseY = point.y;
          const rawWidth = Math.max(8, Math.round(mouseX - el.x));
          const rawHeight = Math.max(8, Math.round(mouseY - el.y));
          let shapeWidth = snapTo8px
            ? Math.max(8, Math.round(rawWidth / 8) * 8)
            : rawWidth;
          let shapeHeight = snapTo8px
            ? Math.max(8, Math.round(rawHeight / 8) * 8)
            : rawHeight;
          if (el.shapeType === "circle" || shiftRef.current) {
            const size = Math.max(shapeWidth, shapeHeight);
            shapeWidth = size;
            shapeHeight = size;
          }
          setConfig((prev) => ({
            ...prev,
            elements: prev.elements.map((item) =>
              item.id === elementResizingId
                ? { ...item, shapeWidth, shapeHeight }
                : item,
            ),
          }));
          return;
        }
        const newFontSize = Math.max(
          8,
          Math.round(el.fontSize || 16) +
            (mouseX - (el.x + (el.fontSize || 16) * 5)) * 0.1,
        );
        setConfig((prev) => {
          const newElements = prev.elements.map((item) =>
            item.id === elementResizingId
              ? { ...item, fontSize: newFontSize }
              : item,
          );
          return {
            ...prev,
            elements: newElements,
          };
        });
        return;
      }
      // Rectangle selection
      if (isRectSelecting && canvasRef.current) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        setRectCurrent(point);
        return;
      }
      if (draggingId && canvasRef.current) {
        const targetElement = config.elements.find(
          (el) => el.id === draggingId,
        );
        if (!targetElement) return;
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;

        // Endpoint dragging for line elements — direct x2,y2 manipulation
        const ep = draggingEndpointRef.current;
        if (ep && targetElement.type === "line") {
          const rawMouseX = Math.round(point.x);
          const rawMouseY = Math.round(point.y);
          const currentX =
            ep === "end"
              ? targetElement.x2 !== undefined
                ? targetElement.x2
                : targetElement.x + (targetElement.lineWidth || 0)
              : targetElement.x;
          const currentY =
            ep === "end"
              ? targetElement.y2 !== undefined
                ? targetElement.y2
                : targetElement.y + (targetElement.lineHeight || 0)
              : targetElement.y;
          const mouseX = snapTo8px
            ? currentX + Math.round((rawMouseX - currentX) / 8) * 8
            : rawMouseX;
          const mouseY = snapTo8px
            ? currentY + Math.round((rawMouseY - currentY) / 8) * 8
            : rawMouseY;
          setConfig((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => {
              if (el.id !== draggingId) return el;
              if (ep === "end") {
                return { ...el, x2: mouseX, y2: mouseY };
              } else {
                // Dragging start: move start point
                const curX2 =
                  el.x2 !== undefined ? el.x2 : el.x + (el.lineWidth || 0);
                const curY2 =
                  el.y2 !== undefined ? el.y2 : el.y + (el.lineHeight || 0);
                return { ...el, x: mouseX, y: mouseY, x2: curX2, y2: curY2 };
              }
            }),
          }));
          return;
        }

        let newX = Math.round(point.x - dragOffset.x);
        let newY = Math.round(point.y - dragOffset.y);
        // Text 要素: visualTop = y - fontSize - 4 → stored y (baseline) に変換
        if (targetElement.type === "text") {
          newY = newY + (targetElement.fontSize || 16) + 4;
        }
        if (snapTo8px) {
          newX = targetElement.x + Math.round((newX - targetElement.x) / 8) * 8;
          newY = targetElement.y + Math.round((newY - targetElement.y) / 8) * 8;
        }
        const SNAP_THRESHOLD = 8;
        const newSnapLines: { x?: number; y?: number } = {};
        const snapXPoints = [0, config.width / 2, config.width];
        const snapYPoints = [0, config.height / 2, config.height];
        config.elements.forEach((el) => {
          if (el.id !== draggingId && el.visible) {
            snapXPoints.push(el.x);
            snapYPoints.push(el.y);
            if (el.type === "text")
              snapYPoints.push(el.y - (el.fontSize || 16));
            // Add line endpoints to snap targets
            if (el.type === "line") {
              const ex =
                el.x2 !== undefined ? el.x2 : el.x + (el.lineWidth || 0);
              const ey =
                el.y2 !== undefined ? el.y2 : el.y + (el.lineHeight || 0);
              snapXPoints.push(ex);
              snapYPoints.push(ey);
            }
          }
        });
        for (const sx of snapXPoints) {
          if (Math.abs(newX - sx) < SNAP_THRESHOLD) {
            newX = sx;
            newSnapLines.x = sx;
            break;
          }
        }
        for (const sy of snapYPoints) {
          const visualY =
            targetElement.type === "text"
              ? newY - (targetElement.fontSize || 16)
              : newY;
          if (Math.abs(visualY - sy) < SNAP_THRESHOLD) {
            newY =
              targetElement.type === "text"
                ? sy + (targetElement.fontSize || 16)
                : sy;
            newSnapLines.y = sy;
            break;
          }
        }
        if (snapTo8px) {
          newX = targetElement.x + Math.round((newX - targetElement.x) / 8) * 8;
          newY = targetElement.y + Math.round((newY - targetElement.y) / 8) * 8;
        }
        setSnapLines(newSnapLines);
        const dx = newX - targetElement.x;
        const dy = newY - targetElement.y;

        setConfig((prev) => {
          const moveElement = (el: CardElement) => ({
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            x2: el.type === "line" && el.x2 !== undefined ? el.x2 + dx : el.x2,
            y2: el.type === "line" && el.y2 !== undefined ? el.y2 + dy : el.y2,
          });
          let newElements;
          if (selectedIds.includes(draggingId)) {
            newElements = prev.elements.map((el) =>
              selectedIds.includes(el.id) ? moveElement(el) : el,
            );
          } else {
            newElements = prev.elements.map((el) =>
              el.id === draggingId ? moveElement(el) : el,
            );
          }
          return {
            ...prev,
            elements: newElements,
          };
        });
      }
    };
    const handleMouseUp = () => {
      // Finalize line drawing
      if (lineDrawing) {
        const dx = lineDrawing.currentX - lineDrawing.startX;
        const dy = lineDrawing.currentY - lineDrawing.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          // Click mode: wait for second click
          setLineDrawing((prev) =>
            prev ? { ...prev, phase: "waiting" } : null,
          );
          return;
        }
        saveToHistory();
        const newEl: CardElement = {
          id: Math.random().toString(36).substr(2, 9),
          type: "line",
          x: lineDrawing.startX,
          y: lineDrawing.startY,
          x2: lineDrawing.currentX,
          y2: lineDrawing.currentY,
          lineStyle: (lineStylePreset || "solid") as CardElement["lineStyle"],
          lineStrokeWidth: lineThickness,
          fontSize: 16,
          visible: true,
          color: lineColor,
        };
        setLineStylePreset(null);
        setConfig((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
        setSelectedIds([newEl.id]);
        setLineDrawing(null);
        return;
      }
      if (shapeDrawing) {
        if (shapeDrawing.phase === "waiting") return;
        const width = Math.abs(shapeDrawing.currentX - shapeDrawing.startX);
        const height = Math.abs(shapeDrawing.currentY - shapeDrawing.startY);
        if (width < 5 && height < 5) {
          setShapeDrawing((prev) =>
            prev ? { ...prev, phase: "waiting" } : null,
          );
          return;
        }
        const preset =
          SHAPE_PRESETS.find((item) => item.type === shapeDrawing.shapeType) ||
          SHAPE_PRESETS[0];
        const newEl: CardElement = {
          id: Math.random().toString(36).slice(2, 11),
          type: "shape",
          x: Math.min(shapeDrawing.startX, shapeDrawing.currentX),
          y: Math.min(shapeDrawing.startY, shapeDrawing.currentY),
          shapeType: shapeDrawing.shapeType,
          shapeWidth: Math.max(8, width),
          shapeHeight: Math.max(8, height),
          shapeStrokeColor,
          shapeStrokeWidth,
          shapeRadius: preset.radius,
          fontSize: 16,
          visible: true,
          color: shapeFillColor,
        };
        saveToHistory();
        setConfig((prev) => ({ ...prev, elements: [newEl, ...prev.elements] }));
        setSelectedIds([newEl.id]);
        setShapeDrawing(null);
        return;
      }
      // Finalize rectangle selection
      if (isRectSelecting && rectStart && rectCurrent) {
        const rx = Math.min(rectStart.x, rectCurrent.x);
        const ry = Math.min(rectStart.y, rectCurrent.y);
        const rw = Math.abs(rectCurrent.x - rectStart.x);
        const rh = Math.abs(rectCurrent.y - rectStart.y);
        const selected = config.elements.filter((el) => {
          // Use element visual position
          const ex = el.x;
          const ey = el.type === "text" ? el.y - (el.fontSize || 16) - 4 : el.y;
          const ew =
            el.type === "text"
              ? estimateTextWidth(el.text || "", el.fontSize || 16) + 8
              : el.type === "shape"
                ? el.shapeWidth || 96
                : 20;
          const eh =
            el.type === "text"
              ? (el.fontSize || 16) + 8
              : el.type === "shape"
                ? el.shapeHeight || 64
                : 20;
          return ex < rx + rw && ex + ew > rx && ey < ry + rh && ey + eh > ry;
        });
        setSelectedIds(selected.map((el) => el.id));
        setIsRectSelecting(false);
        setRectStart(null);
        setRectCurrent(null);
      }
      setDraggingId(null);
      setDraggingEndpoint(null);
      draggingEndpointRef.current = null;
      setResizing(false);
      setElementResizingId(null);
      setSnapLines({});
    };
    if (
      draggingId ||
      resizing ||
      elementResizingId ||
      isRectSelecting ||
      lineDrawing ||
      shapeDrawing
    ) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    draggingId,
    draggingEndpoint,
    resizing,
    elementResizingId,
    isRectSelecting,
    lineDrawing,
    shapeDrawing,
    rectStart,
    rectCurrent,
    dragOffset,
    selectedIds,
    config.elements,
    config.width,
    config.height,
    saveToHistory,
    lineColor,
    lineStylePreset,
    lineThickness,
    shapeFillColor,
    shapeStrokeColor,
    shapeStrokeWidth,
    snapTo8px,
    getCanvasPoint,
  ]);

  if (!mounted || status === "loading" || !isInitialized) {
    return (
      <div className="flex h-screen w-full bg-[#1e1e24] items-center justify-center">
        <span className="text-zinc-500 text-sm tracking-[0.25em] uppercase animate-pulse">
          {t("status.loading")}...
        </span>
      </div>
    );
  }

  const firstSelectedElement = config.elements.find(
    (el) => el.id === selectedIds[0],
  );

  const updateSelected = (updates: Partial<CardElement>) => {
    if (selectedIds.length === 0) return;
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, ...updates } : el,
      ),
    }));
  };

  const snapValue = (value: number) =>
    snapTo8px ? Math.round(value / 8) * 8 : Math.round(value);

  const toggleSnapTo8px = () => {
    if (snapTo8px) {
      setSnapTo8px(false);
      return;
    }
    saveToHistory();
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((element) => ({
        ...element,
        x: Math.round(element.x / 8) * 8,
        y: Math.round(element.y / 8) * 8,
        x2:
          element.x2 === undefined ? undefined : Math.round(element.x2 / 8) * 8,
        y2:
          element.y2 === undefined ? undefined : Math.round(element.y2 / 8) * 8,
      })),
    }));
    setSnapTo8px(true);
  };

  const buildElement = (
    type: ElementType,
    x: number,
    y: number,
    shapeType = selectedShapeType,
  ): CardElement => {
    const base: Partial<CardElement> = {};
    if (type === "text") {
      base.text = textDraft.trim() || t("defaults.newText");
      base.fontSize = textSize;
      base.color = textColor;
    }
    if (type === "badge") {
      base.badgeText = "PRO";
      base.badgeColor = "#7d2ae8";
    }
    if (type === "progress") {
      base.progress = 65;
      base.progressLabel = t("defaults.completion");
      base.progressColor = "#26a641";
      base.progressBarWidth = 160;
    }
    if (type === "languages") {
      base.languageBarWidth = Math.max(
        LANGUAGE_MIN_WIDTH,
        Math.min(320, config.width - 64, LANGUAGE_MAX_WIDTH),
      );
      base.languageCount = DEFAULT_LANGUAGE_COUNT;
    }
    if (type === "calendar") base.calendarFormat = "both";
    if (type === "line") {
      base.x2 = snapValue(x + 152);
      base.y2 = snapValue(y);
      base.lineStyle = (lineStylePreset || "solid") as CardElement["lineStyle"];
      base.lineStrokeWidth = lineThickness;
      base.color = lineColor;
    }
    if (type === "shape") {
      const preset =
        SHAPE_PRESETS.find((item) => item.type === shapeType) ||
        SHAPE_PRESETS[0];
      base.shapeType = preset.type;
      base.shapeWidth =
        shapeType === selectedShapeType ? shapeWidth : preset.width;
      base.shapeHeight =
        shapeType === selectedShapeType ? shapeHeight : preset.height;
      base.shapeStrokeColor = shapeStrokeColor;
      base.shapeStrokeWidth = shapeStrokeWidth;
      base.shapeRadius = preset.radius;
      base.color = shapeFillColor;
    }
    return {
      id: Math.random().toString(36).slice(2, 11),
      type,
      x: snapValue(x),
      y: snapValue(y),
      fontSize: 16,
      visible: true,
      color: "#ffffff",
      ...base,
    };
  };

  const addElementAt = (
    type: ElementType,
    x: number,
    y: number,
    shapeType = selectedShapeType,
    overrides: Partial<CardElement> = {},
  ) => {
    saveToHistory();
    const parsed = cardElementSchema.safeParse({
      ...buildElement(type, x, y, shapeType),
      ...overrides,
    });
    if (!parsed.success) return;
    const newEl = parsed.data;
    setConfig((prev) => ({
      ...prev,
      elements:
        type === "shape"
          ? [newEl, ...prev.elements]
          : [...prev.elements, newEl],
    }));
    setSelectedIds([newEl.id]);
    setLineStylePreset(null);
  };

  const armPlacement = (type: ElementType, shapeType?: ShapeType) => {
    if (shapeType) setSelectedShapeType(shapeType);
    setPlacingType(type);
    setActiveDrawer(null);
  };

  const setElementDragData = (
    event: React.DragEvent,
    type: ElementType,
    shapeType?: ShapeType,
    overrides: Partial<CardElement> = {},
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "application/x-profilecanvas",
      JSON.stringify({ type, shapeType, overrides }),
    );
    event.dataTransfer.setData("text/plain", type);
  };

  const setLineDragData = (
    event: React.DragEvent,
    lineStyle: NonNullable<CardElement["lineStyle"]>,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "application/x-profilecanvas",
      JSON.stringify({
        type: "line",
        overrides: {
          lineStyle,
          lineStrokeWidth: lineThickness,
          color: lineColor,
        },
      }),
    );
    event.dataTransfer.setData("text/plain", "line");
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: CardElement) => {
    if (e.button !== 0 || editingId === el.id || el.locked) return;
    setActiveDrawer(null);
    setPlacingType(null);
    saveToHistory();
    if (!e.shiftKey && !selectedIds.includes(el.id)) {
      setSelectedIds([el.id]);
    } else if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(el.id)
          ? prev.filter((id) => id !== el.id)
          : [...prev, el.id],
      );
    }
    setDraggingId(el.id);
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    const visualY =
      el.type === "text" ? el.y - (el.fontSize || 16) - 4 : el.y;
    setDragOffset({ x: point.x - el.x, y: point.y - visualY });
    e.preventDefault();
  };

  const handleEndpointMouseDown = (
    e: React.MouseEvent,
    el: CardElement,
    which: "start" | "end",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (el.locked) return;
    saveToHistory();
    if (!selectedIds.includes(el.id)) setSelectedIds([el.id]);
    setDraggingId(el.id);
    setDraggingEndpoint(which);
    draggingEndpointRef.current = which;
    // For endpoint drag, offset is irrelevant — absolute positioning in handleMouseMove
    setDragOffset({ x: 0, y: 0 });
  };

  const handleCopyMD = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(buildLinkedCardMarkdown(publishedUrl));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyImg = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(
        `<img src="${publishedUrl}" alt="Profile Card" />`,
      );
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
    }
  };

  const handleCopyPublishedUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        body: JSON.stringify({
          ...config,
          username: config.username || "anonymous",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        setShareUrl(data.url);
        setShowShareModal(true);
      } else {
        showToast(t("errors.createShareLink"));
      }
    } catch {
      showToast(t("errors.network"));
    }
  };

  const SHARE_PLATFORMS: {
    id: string;
    name: string;
    icon: React.ReactNode;
    getUrl: (text: string, url: string) => string;
  }[] = [
    {
      id: "x",
      name: "X",
      icon: <X size={16} />,
      getUrl: (text, url) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + url)}`,
    },
  ];

  return (
    <div
      className="editor-scale flex bg-[#1e1e24] text-[#e1e1e6] font-sans overflow-hidden select-none"
      onClick={() => {
        setSelectedIds([]);
        setEditingId(null);
        setPlacingType(null);
        setShowShortcuts(false);
      }}
    >
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2 rounded text-xs font-bold shadow-lg animate-in slide-in-from-right-2 ${t.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-[#121217] border border-[#2a2a32] rounded-lg p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                {t("editor.shortcuts.title")}
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {[
                ["Ctrl+Z", t("actions.undo")],
                ["Ctrl+Shift+Z", t("actions.redo")],
                ["Ctrl+S", t("actions.save")],
                ["Ctrl+C", t("actions.copy")],
                ["Ctrl+V", t("actions.paste")],
                ["Ctrl+A", t("actions.selectAll")],
                ["Delete", t("actions.delete")],
                ["Shift+Click", t("actions.multiSelect")],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex justify-between py-1 border-b border-[#2a2a32]/50"
                >
                  <kbd className="text-[#7d2ae8] font-bold">{key}</kbd>
                  <span className="text-zinc-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOP TOOLBAR - DARK UI */}
      <header
        className="fixed top-0 left-0 right-0 h-14 bg-[#121217] border-b border-[#2a2a32] z-30 flex items-center px-6 justify-between shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Pencil size={10} className="text-zinc-600 ml-1" />
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.slice(0, 32))}
              placeholder={config.username || "Untitled"}
              className="bg-transparent text-zinc-400 text-xs font-mono outline-none w-[120px] placeholder:text-zinc-700"
              maxLength={32}
            />
          </div>
          <div className="h-4 w-[1px] bg-[#2a2a32] mx-1" />
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-1.5 hover:bg-[#2a2a32] rounded transition-colors disabled:opacity-20"
            title={t("actions.undo")}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 hover:bg-[#2a2a32] rounded transition-colors disabled:opacity-20"
            title={t("actions.redo")}
          >
            <Redo2 size={16} />
          </button>
          <div className="h-4 w-[1px] bg-[#2a2a32] mx-1" />
          <button
            onClick={() => {
              setConfirmModal({
                message: t("confirm.resetCard"),
                onConfirm: () => {
                  setConfig({
                    username: config.username,
                    bgColor: "#0d1117",
                    borderColor: "#30363d",
                    width: 380,
                    height: 158,
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
                  });
                  setHistory([]);
                  setRedoStack([]);
                  setSelectedIds([]);
                },
              });
            }}
            className="p-1.5 hover:bg-[#2a2a32] rounded transition-colors text-zinc-500 hover:text-red-400"
            title={t("actions.reset")}
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {selectedIds.length === 0 ? (
            <div className="flex items-center gap-3 bg-[#1e1e24] px-3 py-1.5 rounded-md border border-[#2a2a32]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {t("editor.background")}
              </span>
              <div className="w-6 h-6 rounded border border-[#3a3a42] overflow-hidden relative">
                <input
                  type="color"
                  value={config.bgColor}
                  onMouseDown={saveToHistory}
                  onChange={(e) =>
                    setConfig({ ...config, bgColor: e.target.value })
                  }
                  className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[
                  "#0d1117",
                  "#1a1a2e",
                  "#222730",
                  "#161b22",
                  "#1c2128",
                  "#25292e",
                  "#2b2d30",
                  "#0f1419",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfig({ ...config, bgColor: c })}
                    className="w-4 h-4 rounded-full border border-[#3a3a42] hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          ) : (
            firstSelectedElement && (
              <div className="flex items-center gap-4 bg-[#1e1e24] px-4 py-1.5 rounded-md border border-[#2a2a32]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                    {t("common.color")}
                  </span>
                  <div className="w-6 h-6 rounded border border-[#3a3a42] overflow-hidden relative">
                    <input
                      type="color"
                      value={firstSelectedElement.color || "#ffffff"}
                      onChange={(e) => {
                        saveToHistory();
                        updateSelected({ color: e.target.value });
                      }}
                      className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )
          )}

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                onClick={() => setShowSizeMenu((current) => !current)}
                className={`flex h-7 items-center gap-1.5 rounded px-2 text-[9px] font-bold transition-colors ${
                  showSizeMenu ||
                  widthMode === "auto" ||
                  heightMode === "auto"
                    ? "bg-[#7d2ae8]/15 text-[#b985ff]"
                    : "text-zinc-500 hover:bg-[#2a2a32] hover:text-white"
                }`}
                title={t("editor.cardSize")}
                aria-label={t("editor.cardSize")}
                aria-expanded={showSizeMenu}
              >
                {config.width} × {config.height}
              </button>
              {showSizeMenu && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[#35313d] bg-[#17161c] p-3 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-white">
                      {t("editor.cardSize")}
                    </p>
                    <p className="mt-1 text-[8px] leading-relaxed text-zinc-600">
                      {t("editor.cardSizeHint")}
                    </p>
                  </div>
                  {[
                    {
                      label: t("editor.orientation.horizontal"),
                      mode: widthMode,
                      setMode: setWidthMode,
                      value: config.width,
                      min: 50,
                      max: 1200,
                      update: (value: number) =>
                        setConfig((current) => ({
                          ...current,
                          width: value,
                        })),
                    },
                    {
                      label: t("editor.orientation.vertical"),
                      mode: heightMode,
                      setMode: setHeightMode,
                      value: config.height,
                      min: 20,
                      max: 800,
                      update: (value: number) =>
                        setConfig((current) => ({
                          ...current,
                          height: value,
                        })),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="mb-2.5 grid grid-cols-[38px_1fr_68px] items-center gap-2 last:mb-0"
                    >
                      <span className="text-[9px] font-bold text-zinc-500">
                        {item.label}
                      </span>
                      <div className="grid grid-cols-2 rounded-md bg-[#222028] p-0.5">
                        {(["auto", "manual"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => item.setMode(mode)}
                            className={`rounded px-1.5 py-1 text-[8px] font-bold transition-colors ${
                              item.mode === mode
                                ? "bg-[#7d2ae8] text-white"
                                : "text-zinc-500 hover:text-white"
                            }`}
                          >
                            {t(
                              mode === "auto"
                                ? "common.auto"
                                : "common.manual",
                            )}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={item.min}
                        max={item.max}
                        value={item.value}
                        disabled={item.mode === "auto"}
                        onFocus={saveToHistory}
                        onChange={(e) =>
                          item.update(
                            Math.max(
                              item.min,
                              Math.min(
                                item.max,
                                parseInt(e.target.value) || item.min,
                              ),
                            ),
                          )
                        }
                        className="h-7 rounded border border-[#35313d] bg-[#111016] px-2 text-[9px] text-zinc-300 outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${showGrid ? "bg-[#7d2ae8]/15 text-[#9d5af2]" : "text-zinc-500 hover:bg-[#2a2a32] hover:text-white"}`}
              title={t("editor.grid")}
              aria-label={t("editor.grid")}
              aria-pressed={showGrid}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="5" cy="5" r="1.35" fill="currentColor" />
                <circle cx="12" cy="5" r="1.35" fill="currentColor" />
                <circle cx="19" cy="5" r="1.35" fill="currentColor" />
                <circle cx="5" cy="12" r="1.35" fill="currentColor" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                <circle cx="19" cy="12" r="1.35" fill="currentColor" />
                <circle cx="5" cy="19" r="1.35" fill="currentColor" />
                <circle cx="12" cy="19" r="1.35" fill="currentColor" />
                <circle cx="19" cy="19" r="1.35" fill="currentColor" />
              </svg>
            </button>
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`p-1 hover:bg-[#2a2a32] rounded transition-colors ${showGuides ? "text-[#7d2ae8]" : "text-zinc-500"}`}
              title={t("editor.guides")}
            >
              <Ruler size={14} />
            </button>
            <button
              onClick={toggleSnapTo8px}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${snapTo8px ? "bg-[#7d2ae8]/15 text-[#9d5af2]" : "text-zinc-500 hover:bg-[#2a2a32] hover:text-white"}`}
              title={`${t("editor.snap8px")}: ${t(snapTo8px ? "common.on" : "common.off")}`}
              aria-label={`${t("editor.snap8px")}: ${t(snapTo8px ? "common.on" : "common.off")}`}
              aria-pressed={snapTo8px}
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5.5 4.5v7.25a6.5 6.5 0 0 0 13 0V4.5"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />
                <path
                  d="M5.5 8h4M14.5 8h4"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  d="M3 20h18"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="1 3"
                  opacity="0.45"
                />
                <circle cx="8" cy="20" r="1" fill="currentColor" />
                <circle cx="16" cy="20" r="1" fill="currentColor" />
                <text
                  x="12"
                  y="15"
                  fill="currentColor"
                  fontSize="7"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  8
                </text>
                {!snapTo8px && (
                  <path
                    d="M4 4l16 16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
            <div className="h-4 w-[1px] bg-[#2a2a32] mx-1" />
            <button
              onClick={importConfig}
              className="p-1 hover:bg-[#2a2a32] rounded transition-colors text-zinc-500 hover:text-white"
              title={t("actions.importJson")}
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleShare}
              className="p-1 hover:bg-[#2a2a32] rounded transition-colors text-zinc-500 hover:text-white"
              title={t("actions.share")}
            >
              <Share2 size={14} />
            </button>
            <div className="h-6 w-[1px] bg-[#2a2a32] mx-1" />
            <button
              onClick={async () => {
                setIsPublishing(true);
                try {
                  const res = await fetch("/api/publish", {
                    method: "POST",
                    body: JSON.stringify(config),
                    headers: { "Content-Type": "application/json" },
                  });
                  if (res.ok) {
                    const url = `${window.location.origin}/${config.username}`;
                    setPublishedUrl(url);
                    setCopied(false);
                    setCopiedImg(false);
                    setCopiedUrl(false);
                    setShowPublishOptions(false);
                    setShowPublishModal(true);
                    showToast(t("status.published"), "success");
                  } else {
                    const err = await res.json().catch(() => ({}));
                    showToast(err.error || t("errors.publish"));
                  }
                } catch {
                  showToast(t("errors.publishNetwork"));
                }
                setIsPublishing(false);
              }}
              disabled={isPublishing}
              className="bg-[#7d2ae8] text-white px-5 py-1.5 rounded-md text-xs font-bold hover:bg-[#6a22c5] shadow-lg flex items-center gap-2 transition-all"
            >
              <Rocket size={14} />
              {isPublishing ? "..." : t("actions.publish")}
            </button>
            <div className="h-6 w-[1px] bg-[#2a2a32] mx-2" />
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white transition-colors"
                title={t("editor.language.title")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>
              {showLangMenu && (
                <div
                  className="absolute right-0 top-full mt-1 bg-[#121217] border border-[#2a2a32] rounded-md shadow-2xl py-1 min-w-[120px] z-50"
                  onClick={() => setShowLangMenu(false)}
                >
                  <button
                    onClick={() => setUserLocale("en")}
                    className={`w-full text-left px-3 py-1.5 text-xs ${locale === "en" ? "text-[#7d2ae8]" : "text-zinc-400 hover:text-white hover:bg-[#2a2a32]"}`}
                  >
                    {t("locale.english")}
                  </button>
                  <button
                    onClick={() => setUserLocale("ja")}
                    className={`w-full text-left px-3 py-1.5 text-xs ${locale === "ja" ? "text-[#7d2ae8]" : "text-zinc-400 hover:text-white hover:bg-[#2a2a32]"}`}
                  >
                    {t("locale.japanese")}
                  </button>
                  <button
                    onClick={() => setUserLocale("ko")}
                    className={`w-full text-left px-3 py-1.5 text-xs ${locale === "ko" ? "text-[#7d2ae8]" : "text-zinc-400 hover:text-white hover:bg-[#2a2a32]"}`}
                  >
                    {t("locale.korean")}
                  </button>
                  <button
                    onClick={() => setUserLocale("zh")}
                    className={`w-full text-left px-3 py-1.5 text-xs ${locale === "zh" ? "text-[#7d2ae8]" : "text-zinc-400 hover:text-white hover:bg-[#2a2a32]"}`}
                  >
                    {t("locale.chinese")}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white transition-colors"
              title={t("editor.shortcuts.title")}
            >
              <Keyboard size={14} />
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white transition-colors"
              title={t("actions.signOut")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <aside
        className="w-[72px] bg-[#121217] pt-14 flex flex-col items-center text-white z-20 overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center py-4">
          <button
            onClick={() => toggleDrawer("templates")}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full mb-2 ${showTemplates ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <LayoutTemplate size={15} />
            <span className="text-[7px] font-bold">
              {t("editor.sidebar.templates")}
            </span>
          </button>
          <button
            onClick={() => toggleDrawer("saved")}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full mb-2 ${showSavedDrawer ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <Bookmark size={15} />
            <span className="text-[7px] font-bold">
              {t("editor.sidebar.saved")}
            </span>
          </button>
          <span className="text-[7px] font-bold text-zinc-600 tracking-[0.2em] mb-2">
            {t("editor.sidebar.core")}
          </span>
          <button
            onClick={() => toggleDrawer("text")}
            draggable
            onDragStart={(e) =>
              setElementDragData(e, "text", undefined, {
                text: textDraft.trim() || t("defaults.newText"),
                fontSize: textSize,
                color: textColor,
              })
            }
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full ${showTextDrawer ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <Type size={15} />
            <span className="text-[7px] font-bold">
              {t("element.text.short")}
            </span>
          </button>
          <button
            onClick={() => toggleDecorationDrawer("line")}
            draggable
            onDragStart={(e) => setElementDragData(e, "line")}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full ${showLineDrawer && decorationTab === "line" ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <Undo2 size={15} className="rotate-90" />
            <span className="text-[7px] font-bold">
              {t("element.line.short")}
            </span>
          </button>
          <button
            onClick={() => toggleDecorationDrawer("shape")}
            draggable
            onDragStart={(e) =>
              setElementDragData(e, "shape", selectedShapeType, {
                color: shapeFillColor,
                shapeWidth,
                shapeHeight,
                shapeStrokeColor,
                shapeStrokeWidth,
              })
            }
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full ${showLineDrawer && decorationTab === "shape" ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <Square size={15} />
            <span className="text-[7px] font-bold">
              {t("element.shape.short")}
            </span>
          </button>

          <span className="text-[7px] font-bold text-zinc-600 tracking-[0.2em] mt-3 mb-2">
            {t("editor.sidebar.data")}
          </span>
          <button
            onClick={() => toggleDrawer("data")}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full ${showDataDrawer ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <BarChart3 size={15} />
            <span className="text-[7px] font-bold">
              {t("editor.sidebar.data")}
            </span>
          </button>

          <span className="text-[7px] font-bold text-zinc-600 tracking-[0.2em] mt-3 mb-2">
            {t("editor.sidebar.misc")}
          </span>
          <button
            onClick={() => toggleDrawer("widgets")}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 w-full ${showWidgetDrawer ? "opacity-100 text-[#7d2ae8]" : "opacity-50 hover:opacity-100"}`}
          >
            <Award size={15} />
            <span className="text-[7px] font-bold">
              {t("editor.widgets.title")}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile template drawer backdrop */}
      {showTemplates && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setShowTemplates(false)}
        />
      )}

      {/* Template drawer */}
      {showTemplates && (
        <aside
          className={`w-[240px] bg-[#121217] flex flex-col z-20 border-l border-[#2a2a32] overflow-y-auto scrollbar-thin md:relative md:flex md:pt-14 fixed left-0 top-14 bottom-0 pt-4 animate-in slide-in-from-left-2 duration-150`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
              {t("editor.sidebar.templates")}
            </p>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-zinc-500 hover:text-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 pt-2">
            {/* Color pickers */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                    {t("common.backgroundShort")}
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      "#ffffff",
                      "#f5f5f5",
                      "#e8e8e8",
                      "#dcdcdc",
                      "#0d1117",
                      "#1a1a2e",
                      "#222730",
                      "#161b22",
                      "#1c2128",
                      "#25292e",
                      "#2b2d30",
                      "#0f1419",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPreviewBgColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${previewBgColor === c ? "border-[#7d2ae8] ring-1 ring-[#7d2ae8]" : "border-[#3a3a42]"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <button
                      onClick={() => setShowCustomBg(!showCustomBg)}
                      className="w-5 h-5 rounded-full border border-dashed border-zinc-500 flex items-center justify-center text-zinc-500 text-[10px] font-bold hover:border-[#7d2ae8] hover:text-[#7d2ae8] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {showCustomBg && (
                    <div className="flex gap-1 items-center mt-1">
                      <div
                        className="w-4 h-4 rounded border border-[#3a3a42] shrink-0"
                        style={{ backgroundColor: customBgHex }}
                      />
                      <input
                        type="text"
                        value={customBgHex}
                        onChange={(e) => setCustomBgHex(e.target.value)}
                        onBlur={() => {
                          if (/^#[0-9a-fA-F]{6}$/.test(customBgHex))
                            setPreviewBgColor(customBgHex);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (/^#[0-9a-fA-F]{6}$/.test(customBgHex))
                              setPreviewBgColor(customBgHex);
                            setShowCustomBg(false);
                          }
                        }}
                        className="w-16 text-[8px] px-1 py-0.5 bg-[#1e1e24] border border-[#2a2a32] rounded text-zinc-300 font-mono"
                        placeholder="#000000"
                        maxLength={7}
                      />
                      <button
                        onClick={() => {
                          if (/^#[0-9a-fA-F]{6}$/.test(customBgHex))
                            setPreviewBgColor(customBgHex);
                          setShowCustomBg(false);
                        }}
                        className="text-[8px] text-[#7d2ae8] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                    {t("common.textColor")}
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      "#ffffff",
                      "#58a6ff",
                      "#e3b341",
                      "#e94560",
                      "#7d2ae8",
                      "#26a641",
                      "#f78166",
                      "#8b949e",
                      "#000000",
                      "#1a1a2e",
                      "#333333",
                      "#666666",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPreviewTextColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${previewTextColor === c ? "border-[#7d2ae8] ring-1 ring-[#7d2ae8]" : "border-[#3a3a42]"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <button
                      onClick={() => setShowCustomText(!showCustomText)}
                      className="w-5 h-5 rounded-full border border-dashed border-zinc-500 flex items-center justify-center text-zinc-500 text-[10px] font-bold hover:border-[#7d2ae8] hover:text-[#7d2ae8] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {showCustomText && (
                    <div className="flex gap-1 items-center mt-1">
                      <div
                        className="w-4 h-4 rounded border border-[#3a3a42] shrink-0"
                        style={{ backgroundColor: customTextHex }}
                      />
                      <input
                        type="text"
                        value={customTextHex}
                        onChange={(e) => setCustomTextHex(e.target.value)}
                        onBlur={() => {
                          if (/^#[0-9a-fA-F]{6}$/.test(customTextHex))
                            setPreviewTextColor(customTextHex);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (/^#[0-9a-fA-F]{6}$/.test(customTextHex))
                              setPreviewTextColor(customTextHex);
                            setShowCustomText(false);
                          }
                        }}
                        className="w-16 text-[8px] px-1 py-0.5 bg-[#1e1e24] border border-[#2a2a32] rounded text-zinc-300 font-mono"
                        placeholder="#ffffff"
                        maxLength={7}
                      />
                      <button
                        onClick={() => {
                          if (/^#[0-9a-fA-F]{6}$/.test(customTextHex))
                            setPreviewTextColor(customTextHex);
                          setShowCustomText(false);
                        }}
                        className="text-[8px] text-[#7d2ae8] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              {t("editor.templates.title")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    loadTemplate(t);
                    setShowTemplates(false);
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <img
                    src={
                      templatePreviews[t]
                        ? `data:image/svg+xml,${encodeURIComponent(templatePreviews[t])}`
                        : `/templates/${t}.svg`
                    }
                    alt={t}
                    className="w-full aspect-[3/2] object-contain rounded border border-[#2a2a32] bg-[#1e1e24] group-hover:border-[#7d2ae8] transition-colors"
                  />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase group-hover:text-white transition-colors">
                    {t}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Text drawer */}
      {showTextDrawer && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setActiveDrawer(null)}
          />
          <aside
            className="fixed bottom-0 left-0 top-14 z-20 flex w-[260px] flex-col overflow-y-auto border-l border-[#2a2a32] bg-[#121217] pt-4 md:relative md:flex md:pt-14"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {t("element.text.name")}
              </p>
              <button
                onClick={() => setActiveDrawer(null)}
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-[#2a2a32] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
            <div className="space-y-5 p-4">
              <div
                draggable
                onDragStart={(event) =>
                  setElementDragData(event, "text", undefined, {
                    text: textDraft.trim() || t("defaults.newText"),
                    fontSize: textSize,
                    color: textColor,
                  })
                }
                className="flex h-24 items-center overflow-hidden rounded-lg border border-[#2a2a32] bg-[radial-gradient(circle_at_top,#272331_0%,#18181e_65%)] p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/svg+xml,${encodeURIComponent(textPreviewSvg)}`}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                  {t("inspector.content")}
                </label>
                <input
                  type="text"
                  value={textDraft}
                  onChange={(event) =>
                    setTextDraft(event.target.value.slice(0, 200))
                  }
                  placeholder={t("defaults.newText")}
                  maxLength={200}
                  className="w-full rounded-md border border-[#303039] bg-[#1b1b21] px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#7d2ae8]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                    {t("inspector.fontSize")}
                  </label>
                  <span className="text-[9px] font-mono text-zinc-400">
                    {textSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={96}
                  value={textSize}
                  onChange={(event) => setTextSize(Number(event.target.value))}
                  className="w-full accent-[#7d2ae8]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                  {t("common.color")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#ffffff",
                    "#58a6ff",
                    "#e3b341",
                    "#e94560",
                    "#7d2ae8",
                    "#26a641",
                    "#f78166",
                    "#8b949e",
                    "#000000",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${textColor === color ? "border-white ring-2 ring-[#7d2ae8]" : "border-[#3a3a42]"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-zinc-500">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(event) => setTextColor(event.target.value)}
                      className="absolute -inset-2 h-10 w-10 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => armPlacement("text")}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#7d2ae8] px-3 py-2.5 text-[10px] font-bold text-white transition-colors hover:bg-[#8d42f0]"
              >
                <Plus size={13} /> {t("actions.add")}
              </button>
              <p className="text-center text-[8px] leading-relaxed text-zinc-600">
                {t("editor.drawer.addHint")}
              </p>
            </div>
          </aside>
        </>
      )}

      {/* Decoration drawer */}
      {showLineDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setShowLineDrawer(false)}
          />
          <aside
            className={`w-[240px] bg-[#121217] flex flex-col z-20 border-l border-[#2a2a32] overflow-y-auto scrollbar-thin md:relative md:flex md:pt-14 fixed left-0 top-14 bottom-0 pt-4 animate-in slide-in-from-left-2 duration-150`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-0">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                {t("editor.decoration.title")}
              </p>
              <button
                onClick={() => setShowLineDrawer(false)}
                className="text-zinc-500 hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pt-2">
              <div className="mb-4 grid grid-cols-2 rounded bg-[#1e1e24] p-1">
                <button
                  onClick={() => setDecorationTab("line")}
                  className={`rounded px-2 py-1.5 text-[9px] font-bold ${decorationTab === "line" ? "bg-[#7d2ae8] text-white" : "text-zinc-500 hover:text-white"}`}
                >
                  {t("element.line.short")}
                </button>
                <button
                  onClick={() => setDecorationTab("shape")}
                  className={`rounded px-2 py-1.5 text-[9px] font-bold ${decorationTab === "shape" ? "bg-[#7d2ae8] text-white" : "text-zinc-500 hover:text-white"}`}
                >
                  {t("element.shape.short")}
                </button>
              </div>
              <p className="mb-4 text-[9px] leading-relaxed text-zinc-500">
                {t("editor.drawer.addHint")}
              </p>
              {decorationTab === "line" && (
                <>
                  {/* Color picker */}
                  <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {t("common.colorUpper")}
                  </p>
                  <div className="flex gap-1 flex-wrap mb-4">
                    {[
                      "#ffffff",
                      "#58a6ff",
                      "#e3b341",
                      "#e94560",
                      "#7d2ae8",
                      "#26a641",
                      "#f78166",
                      "#8b949e",
                      "#000000",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => setLineColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${lineColor === c ? "border-[#7d2ae8] ring-1 ring-[#7d2ae8]" : "border-[#3a3a42]"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  {/* Thickness presets */}
                  <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {t("inspector.line.thickness")}
                  </p>
                  <div className="flex gap-2 mb-4">
                    {[
                      { label: "1px", v: 1 },
                      { label: "2px", v: 2 },
                      { label: "3px", v: 3 },
                      { label: "5px", v: 5 },
                      { label: "8px", v: 8 },
                    ].map((t) => (
                      <button
                        key={t.v}
                        onClick={() => setLineThickness(t.v)}
                        className={`w-8 h-8 text-[9px] font-bold rounded border transition-colors ${lineThickness === t.v ? "bg-[#7d2ae8] text-white border-[#7d2ae8]" : "bg-[#1e1e24] text-zinc-400 border-[#2a2a32] hover:bg-[#2a2a32]"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Style presets */}
                  <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {t("inspector.style")}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {LINE_STYLE_PRESETS.map((style) => (
                      <button
                        key={style}
                        draggable
                        onDragStart={(event) => setLineDragData(event, style)}
                        onClick={() => {
                          setPlacingType("line");
                          setShowLineDrawer(false);
                          setLineStylePreset(style);
                        }}
                        className="group flex flex-col items-center gap-1 rounded border border-[#2a2a32] bg-[#1e1e24] px-1 py-2 text-zinc-400 transition-colors hover:bg-[#2a2a32] hover:text-white"
                      >
                        <img
                          alt=""
                          src={`/line-previews/${lineThickness}/${style}-${LINE_COLOR_NAMES[lineColor] || "white"}.svg`}
                          width="80"
                          height="16"
                          className="group-hover:brightness-110"
                        />
                        <span className="text-[7px] font-bold text-zinc-500 group-hover:text-white">
                          {t(LINE_STYLE_LABELS[style])}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {decorationTab === "shape" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                      {t("common.color")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "#ffffff",
                        "#58a6ff",
                        "#e3b341",
                        "#e94560",
                        "#7d2ae8",
                        "#26a641",
                        "#f78166",
                        "#8b949e",
                        "#000000",
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setShapeFillColor(color)}
                          className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${shapeFillColor === color ? "border-white ring-2 ring-[#7d2ae8]" : "border-[#3a3a42]"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-zinc-500">
                        <input
                          type="color"
                          value={shapeFillColor}
                          onChange={(event) =>
                            setShapeFillColor(event.target.value)
                          }
                          className="absolute -inset-2 h-10 w-10 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_72px] gap-3">
                    <div className="space-y-2">
                      <label className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                        {t("inspector.shape.strokeColor")}
                      </label>
                      <input
                        type="color"
                        value={shapeStrokeColor}
                        onChange={(event) =>
                          setShapeStrokeColor(event.target.value)
                        }
                        className="h-8 w-full cursor-pointer rounded border border-[#303039] bg-[#1b1b21]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                        {t("inspector.shape.strokeWidth")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={shapeStrokeWidth}
                        onChange={(event) =>
                          setShapeStrokeWidth(
                            Math.max(
                              0,
                              Math.min(20, Number(event.target.value)),
                            ),
                          )
                        }
                        className="h-8 w-full rounded border border-[#303039] bg-[#1b1b21] px-2 text-xs outline-none focus:border-[#7d2ae8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                        {t("inspector.width")}
                      </label>
                      <input
                        type="number"
                        min={8}
                        max={1200}
                        step={snapTo8px ? 8 : 1}
                        value={shapeWidth}
                        onChange={(event) => {
                          const value = Math.max(
                            8,
                            Math.min(1200, Number(event.target.value)),
                          );
                          setShapeWidth(value);
                          if (selectedShapeType === "circle")
                            setShapeHeight(value);
                        }}
                        className="h-8 w-full rounded border border-[#303039] bg-[#1b1b21] px-2 text-xs outline-none focus:border-[#7d2ae8]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                        {t("inspector.height")}
                      </label>
                      <input
                        type="number"
                        min={8}
                        max={1200}
                        step={snapTo8px ? 8 : 1}
                        value={shapeHeight}
                        onChange={(event) => {
                          const value = Math.max(
                            8,
                            Math.min(1200, Number(event.target.value)),
                          );
                          setShapeHeight(value);
                          if (selectedShapeType === "circle")
                            setShapeWidth(value);
                        }}
                        className="h-8 w-full rounded border border-[#303039] bg-[#1b1b21] px-2 text-xs outline-none focus:border-[#7d2ae8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {SHAPE_PRESETS.map((preset) => {
                      const isSelected = selectedShapeType === preset.type;
                      const presetWidth = isSelected
                        ? shapeWidth
                        : preset.width;
                      const presetHeight = isSelected
                        ? shapeHeight
                        : preset.height;
                      return (
                        <button
                          key={preset.type}
                          draggable
                          onDragStart={(event) =>
                            setElementDragData(event, "shape", preset.type, {
                              color: shapeFillColor,
                              shapeWidth: presetWidth,
                              shapeHeight: presetHeight,
                              shapeStrokeColor,
                              shapeStrokeWidth,
                              shapeRadius: preset.radius,
                            })
                          }
                          onClick={() => {
                            if (selectedShapeType !== preset.type) {
                              setSelectedShapeType(preset.type);
                              setShapeWidth(preset.width);
                              setShapeHeight(preset.height);
                            }
                          }}
                          className={`group flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 transition-colors ${isSelected ? "border-[#7d2ae8] bg-[#7d2ae8]/10 text-[#b985ff]" : "border-[#2a2a32] bg-[#1e1e24] text-zinc-500 hover:border-[#4b3a62] hover:text-white"}`}
                          title={t("editor.hint.dragOrClick")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/svg+xml,${encodeURIComponent(shapePreviewSvgs[preset.type])}`}
                            alt=""
                            className="h-12 w-full object-contain"
                          />
                          <span className="text-center text-[8px] font-bold">
                            {t(preset.label)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => armPlacement("shape", selectedShapeType)}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[#7d2ae8] px-3 py-2.5 text-[10px] font-bold text-white transition-colors hover:bg-[#8d42f0]"
                  >
                    <Plus size={13} /> {t("actions.add")}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {(showDataDrawer || showWidgetDrawer) && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setActiveDrawer(null)}
          />
          <aside
            className="fixed bottom-0 left-0 top-14 z-20 flex w-[240px] flex-col overflow-y-auto border-l border-[#2a2a32] bg-[#121217] pt-4 md:relative md:flex md:pt-14"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">
                {showDataDrawer
                  ? t("editor.githubData.title")
                  : t("editor.widgets.title")}
              </p>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="mb-4 text-[9px] leading-relaxed text-zinc-500">
                {t("editor.drawer.addHint")}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {(showDataDrawer ? DATA_TOOLS : WIDGET_TOOLS).map((tool) => (
                  <button
                    key={tool.type}
                    draggable
                    onDragStart={(event) =>
                      setElementDragData(event, tool.type)
                    }
                    onClick={() => armPlacement(tool.type)}
                    className="group overflow-hidden rounded-lg border border-[#2a2a32] bg-[#18181e] text-left transition-all hover:border-[#5c427e] hover:bg-[#1d1b23]"
                    title={t("editor.hint.dragOrClick")}
                  >
                    <div className="h-[108px] w-full overflow-hidden bg-[radial-gradient(circle_at_top,#24212c_0%,#121217_72%)] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/svg+xml,${encodeURIComponent(elementPreviewSvgs[tool.type] || "")}`}
                        alt=""
                        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-[#2a2a32] px-3 py-2">
                      <span className="text-[8px] font-bold text-zinc-400 group-hover:text-white">
                        {t(tool.label)}
                      </span>
                      <Plus
                        size={11}
                        className="text-zinc-600 group-hover:text-[#9d5af2]"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Saved drawer */}
      {showSavedDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setShowSavedDrawer(false)}
          />
          <aside
            className={`w-[240px] bg-[#121217] flex flex-col z-20 border-l border-[#2a2a32] overflow-y-auto scrollbar-thin md:relative md:flex md:pt-14 fixed left-0 top-14 bottom-0 pt-4 animate-in slide-in-from-left-2 duration-150`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-0">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">
                {t("editor.sidebar.saved")}
              </p>
              <button
                onClick={() => setShowSavedDrawer(false)}
                className="text-zinc-500 hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pt-2">
              <button
                onClick={saveAsTemplate}
                className="w-full mb-4 py-1.5 text-[9px] font-bold bg-[#1e1e24] hover:bg-[#2a2a32] text-zinc-400 hover:text-white rounded border border-dashed border-[#2a2a32] transition-colors"
              >
                {t("editor.saved.saveCurrent")}
              </button>
              {savedCards.length === 0 && (
                <p className="text-[9px] text-zinc-600 text-center py-8">
                  {t("editor.saved.empty")}
                </p>
              )}
              <div className="space-y-1">
                {savedCards.map((sc: SavedCard, i: number) => (
                  <button
                    key={i}
                    onClick={() => {
                      setConfig({ ...sc.config });
                      saveToHistory();
                      setShowSavedDrawer(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white hover:bg-[#2a2a32] rounded border border-[#2a2a32] transition-colors truncate"
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-full mt-3 py-1.5 text-[9px] text-zinc-600 hover:text-white hover:bg-[#2a2a32] rounded border border-dashed border-[#2a2a32] transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={10} /> {t("editor.saved.exportOrNew")}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* + Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-[#121217] border border-[#2a2a32] rounded-lg p-6 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white mb-4">
              + {t("editor.saved.exportOrNew")}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  exportConfig();
                  setShowSaveModal(false);
                }}
                className="w-full py-2 text-[10px] font-bold bg-[#7d2ae8] hover:bg-[#6a22c5] text-white rounded transition-colors"
              >
                {t("actions.exportJson")}
              </button>
              <button
                onClick={() => {
                  setConfig(defaultConfig);
                  setCardName("");
                  setHistory([]);
                  setRedoStack([]);
                  setSelectedIds([]);
                  setShowSaveModal(false);
                }}
                className="w-full py-2 text-[10px] font-bold border border-[#2a2a32] text-zinc-400 hover:text-white rounded transition-colors"
              >
                {t("editor.saved.newCard")}
              </button>
            </div>
            <button
              onClick={() => setShowSaveModal(false)}
              className="mt-4 text-[9px] text-zinc-500 hover:text-white"
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Prompt modal */}
      {promptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPromptModal(null)}
        >
          <div
            className="bg-[#121217] border border-[#2a2a32] rounded-lg p-6 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white mb-4">
              {promptModal.message}
            </p>
            <input
              type="text"
              id="prompt-input"
              defaultValue={promptModal.defaultValue}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  promptModal.onConfirm(e.currentTarget.value);
                }
              }}
              className="w-full text-xs px-3 py-2 bg-[#1e1e24] border border-[#2a2a32] rounded text-zinc-300 outline-none mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "prompt-input",
                  ) as HTMLInputElement;
                  promptModal.onConfirm(el?.value || "");
                }}
                className="flex-1 py-1.5 text-[9px] font-bold bg-[#7d2ae8] hover:bg-[#6a22c5] text-white rounded transition-colors"
              >
                OK
              </button>
              <button
                onClick={() => setPromptModal(null)}
                className="flex-1 py-1.5 text-[9px] font-bold border border-[#2a2a32] text-zinc-400 hover:text-white rounded transition-colors"
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-[#121217] border border-[#2a2a32] rounded-lg p-6 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-zinc-300 mb-4">{confirmModal.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-1.5 text-[9px] font-bold bg-[#7d2ae8] hover:bg-[#6a22c5] text-white rounded transition-colors"
              >
                OK
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-1.5 text-[9px] font-bold border border-[#2a2a32] text-zinc-400 hover:text-white rounded transition-colors"
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-[#121217] border border-[#2a2a32] rounded-lg p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {t("share.title")}
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-[#1e1e24] border border-[#2a2a32] rounded p-3 mb-4">
              <textarea
                value={shareMessage}
                onChange={(e) => setCustomShareMessage(e.target.value)}
                className="w-full text-xs text-zinc-300 bg-transparent border-none outline-none resize-none leading-relaxed"
                rows={3}
                placeholder={t("share.messagePlaceholder")}
              />
              {shareUrl && (
                <p className="text-[10px] text-[#7d2ae8] mt-2 break-all">
                  {shareUrl}
                </p>
              )}
            </div>
            <div className="space-y-2">
              {SHARE_PLATFORMS.map((platform) => (
                <a
                  key={platform.id}
                  href={
                    shareUrl ? platform.getUrl(shareMessage, shareUrl) : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-2 rounded text-xs font-bold transition-colors ${shareUrl ? "bg-[#1e1e24] border border-[#2a2a32] text-zinc-300 hover:bg-[#2a2a32] hover:text-white" : "bg-[#1e1e24] border border-[#2a2a32] text-zinc-600 cursor-not-allowed"}`}
                  onClick={(e) => {
                    if (!shareUrl) e.preventDefault();
                  }}
                >
                  {platform.icon}
                  {t("share.platformLabel")} {platform.name}
                </a>
              ))}
              <button
                onClick={() => {
                  if (shareUrl) {
                    navigator.clipboard.writeText(
                      `${shareMessage} ${shareUrl}`,
                    );
                    showToast(t("status.copied"), "success");
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-2 rounded text-xs font-bold border border-[#2a2a32] text-zinc-400 hover:text-white hover:bg-[#2a2a32] transition-colors"
              >
                <Copy size={14} />
                {t("share.copyTextAndLink")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish result modal */}
      {showPublishModal && publishedUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowPublishModal(false);
            setShowPublishOptions(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-[#35313d] bg-[#121217] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {t("publishDialog.title")}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {t("publishDialog.description")}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setShowPublishOptions(false);
                }}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-[#24222a] hover:text-white"
                aria-label={t("actions.close")}
              >
                <X size={18} />
              </button>
            </div>

            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-[#302c37] bg-[#0d0c11] p-3 transition-colors hover:border-[#7d2ae8]/60"
            >
              <img
                src={publishedUrl}
                alt="Profile Card Preview"
                className="mx-auto max-h-64 max-w-full rounded"
              />
            </a>

            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block truncate text-[10px] text-[#9d5af2] hover:text-[#b985ff] hover:underline"
            >
              {publishedUrl}
            </a>

            <div className="mt-5 flex items-stretch gap-2">
              <button
                onClick={handleCopyMD}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-[#7d2ae8] text-white shadow-lg shadow-[#7d2ae8]/20 hover:bg-[#8b3bed]"
                }`}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? t("status.copiedUpper") : t("actions.copyMarkdown")}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPublishOptions((current) => !current)}
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#35313d] bg-[#1b1a20] text-zinc-400 transition-colors hover:bg-[#26242d] hover:text-white"
                  title={t("actions.moreOptions")}
                  aria-label={t("actions.moreOptions")}
                  aria-expanded={showPublishOptions}
                >
                  <MoreHorizontal size={20} />
                </button>

                {showPublishOptions && (
                  <div className="absolute bottom-full right-0 z-10 mb-2 w-52 overflow-hidden rounded-lg border border-[#35313d] bg-[#1a191f] p-1.5 shadow-2xl">
                    <button
                      onClick={() => {
                        handleCopyImg();
                        setShowPublishOptions(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-[#292630] hover:text-white"
                    >
                      {copiedImg ? <Check size={15} /> : <Copy size={15} />}
                      {copiedImg
                        ? t("status.copiedUpper")
                        : t("actions.copyImageTag")}
                    </button>
                    <button
                      onClick={() => {
                        handleCopyPublishedUrl();
                        setShowPublishOptions(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-[#292630] hover:text-white"
                    >
                      {copiedUrl ? <Check size={15} /> : <Link2 size={15} />}
                      {copiedUrl
                        ? t("status.copiedUpper")
                        : t("actions.copyPublishedUrl")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile right panel toggle */}
      <button
        onClick={() => setShowRightPanel(true)}
        className="fixed bottom-4 right-4 z-20 md:hidden w-10 h-10 bg-[#7d2ae8] rounded-full flex items-center justify-center text-white shadow-lg"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* MIDDLE: GHOST CANVAS */}
      <main className="flex-1 relative bg-[#1e1e24] flex flex-col items-center justify-center pt-14 overflow-auto min-w-0">
        <div className="w-full max-w-[850px] bg-[#0d1117] rounded-lg shadow-2xl border border-[#30363d] flex flex-col min-h-[300px] md:min-h-[550px] my-12 mx-2 md:mx-0">
          <div className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center px-4 gap-4 text-[#7d8590] text-xs font-semibold rounded-t-lg">
            <GitBranch size={16} />
            <div className="flex gap-4">
              <span>{t("editor.overview")}</span>
              <span className="text-[#e6edf3] border-b-2 border-[#f78166] pb-3 pt-1 px-1">
                README.md
              </span>
              <span>{t("svg.stats.repositories")}</span>
            </div>
          </div>

          <div className="flex-1 flex p-8 gap-8">
            <div className="w-[200px] space-y-4 shrink-0">
              <div className="w-full aspect-square bg-[#30363d] rounded-full overflow-hidden relative">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="object-cover"
                    style={{
                      position: "absolute",
                      inset: 0,
                      height: "100%",
                      width: "100%",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-[#e6edf3]">
                  {session?.user?.name || config.username}
                </div>
                <div className="text-[#7d8590] text-sm">{config.username}</div>
              </div>
              <div className="h-20 border border-[#30363d] rounded-md flex items-center justify-center text-[10px] text-zinc-500 uppercase font-bold tracking-widest opacity-30">
                {t("editor.preview.sidebarMockup")}
              </div>
            </div>

            {/* README AREA - WHERE THE CARD LIVES */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-[#7d8590] text-[10px] font-bold uppercase tracking-tight pb-2 border-b border-[#30363d]">
                <Monitor size={12} /> README.md
              </div>

              <div className="relative min-h-[300px] flex items-start pt-8 justify-center rounded-md">
                {/* ACTUAL CANVAS / CARD */}
                <div
                  ref={canvasRef}
                  onMouseDown={(e) => {
                    if (
                      e.button === 0 &&
                      (lineDrawing?.phase === "waiting" ||
                        shapeDrawing?.phase === "waiting")
                    ) {
                      const point = getCanvasPoint(e.clientX, e.clientY);
                      if (!point) return;
                      const x = snapValue(point.x);
                      const y = snapValue(point.y);
                      if (lineDrawing?.phase === "waiting") {
                        setLineDrawing((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentX: x,
                                currentY: y,
                                phase: "drawing",
                              }
                            : null,
                        );
                      }
                      if (shapeDrawing?.phase === "waiting") {
                        const constrained = constrainShapePoint(
                          shapeDrawing,
                          x,
                          y,
                          e.shiftKey,
                        );
                        setShapeDrawing((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentX: snapValue(constrained.x),
                                currentY: snapValue(constrained.y),
                                phase: "drawing",
                              }
                            : null,
                        );
                      }
                      e.preventDefault();
                      return;
                    }
                    // Place mode: click-to-place on canvas
                    if (placingType && e.button === 0) {
                      const point = getCanvasPoint(e.clientX, e.clientY);
                      if (!point) return;
                      const x = snapValue(point.x);
                      const y = snapValue(point.y);
                      const type = placingType;
                      if (type === "line") {
                        setLineDrawing({
                          startX: x,
                          startY: y,
                          currentX: x,
                          currentY: y,
                        });
                        setPlacingType(null);
                        return;
                      }
                      if (type === "shape") {
                        setShapeDrawing({
                          startX: x,
                          startY: y,
                          currentX: snapValue(x + shapeWidth),
                          currentY: snapValue(y + shapeHeight),
                          shapeType: selectedShapeType,
                          phase: "waiting",
                        });
                        setPlacingType(null);
                        return;
                      }
                      setPlacingType(null);
                      addElementAt(type, x, y);
                      return;
                    }
                    // Start rectangle selection on canvas background
                    if (
                      e.button !== 0 ||
                      canvasRef.current?.contains(e.target as Node) === false
                    )
                      return;
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-el-id]")) return;
                    const point = getCanvasPoint(e.clientX, e.clientY);
                    if (!point) return;
                    setIsRectSelecting(true);
                    setRectStart(point);
                    setRectCurrent(point);
                    setSelectedIds([]);
                  }}
                  onClick={(e) => {
                    if (placingType) return;
                    e.stopPropagation();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    let type = e.dataTransfer.getData(
                      "text/plain",
                    ) as ElementType;
                    let shapeType: ShapeType | undefined;
                    let overrides: Partial<CardElement> = {};
                    const payload = e.dataTransfer.getData(
                      "application/x-profilecanvas",
                    );
                    if (payload) {
                      try {
                        const parsed = JSON.parse(payload) as {
                          type?: ElementType;
                          shapeType?: ShapeType;
                          overrides?: Partial<CardElement>;
                        };
                        if (parsed.type) type = parsed.type;
                        shapeType = parsed.shapeType;
                        if (parsed.overrides) overrides = parsed.overrides;
                      } catch {}
                    }
                    if (!type) return;
                    const point = getCanvasPoint(e.clientX, e.clientY);
                    if (!point) return;
                    addElementAt(
                      type,
                      point.x,
                      point.y,
                      shapeType || selectedShapeType,
                      overrides,
                    );
                  }}
                  className={`relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-no-repeat group/canvas ring-1 ${placingType ? "ring-[#7d2ae8] ring-2" : "ring-white/5"}`}
                  style={{
                    width: Math.min(
                      config.width,
                      typeof window !== "undefined"
                        ? window.innerWidth - 20
                        : config.width,
                    ),
                    height: config.height,
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.borderColor}`,
                    borderRadius: "6px",
                    maxWidth: "100%",
                    cursor: placingType ? "crosshair" : undefined,
                  }}
                >
                  {/* SVG background — shows exact output rendering */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ borderRadius: "6px", pointerEvents: "none" }}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />

                  {/* Snap Lines */}
                  {snapLines.x !== undefined && (
                    <div
                      className="absolute top-0 bottom-0 w-[1px] bg-[#7d2ae8] z-40"
                      style={{ left: snapLines.x }}
                    />
                  )}
                  {snapLines.y !== undefined && (
                    <div
                      className="absolute left-0 right-0 h-[1px] bg-[#7d2ae8] z-40"
                      style={{ top: snapLines.y }}
                    />
                  )}

                  {/* Line Drawing Preview */}
                  {lineDrawing && (
                    <svg
                      className="absolute inset-0 pointer-events-none z-30"
                      style={{ overflow: "visible" }}
                    >
                      <line
                        x1={lineDrawing.startX}
                        y1={lineDrawing.startY}
                        x2={lineDrawing.currentX}
                        y2={lineDrawing.currentY}
                        stroke="#7d2ae8"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        opacity="0.4"
                      />
                    </svg>
                  )}
                  {shapeDrawing &&
                    (() => {
                      const left = Math.min(
                        shapeDrawing.startX,
                        shapeDrawing.currentX,
                      );
                      const top = Math.min(
                        shapeDrawing.startY,
                        shapeDrawing.currentY,
                      );
                      const width = Math.max(
                        1,
                        Math.abs(shapeDrawing.currentX - shapeDrawing.startX),
                      );
                      const height = Math.max(
                        1,
                        Math.abs(shapeDrawing.currentY - shapeDrawing.startY),
                      );
                      return (
                        <div
                          className="pointer-events-none absolute z-30 text-[#9d5af2]"
                          style={{ left, top, width, height }}
                        >
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 48 48"
                            preserveAspectRatio="none"
                            className="h-full w-full overflow-visible opacity-45"
                          >
                            {renderShapeDrawingPreview(
                              shapeDrawing.shapeType,
                              shapeFillColor,
                              shapeStrokeColor,
                              shapeStrokeWidth,
                            )}
                          </svg>
                          <div className="absolute inset-0 border border-dashed border-[#9d5af2]" />
                          <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-[#121217] px-1.5 py-0.5 text-[8px] font-bold text-[#b985ff]">
                            {Math.round(width)} × {Math.round(height)}
                          </span>
                        </div>
                      );
                    })()}

                  {/* 8px minor grid with a stronger 32px major grid */}
                  {showGrid && (
                    <svg
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                      aria-hidden="true"
                    >
                      <defs>
                        <pattern
                          id="editor-grid-minor"
                          width="8"
                          height="8"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle
                            cx="0.75"
                            cy="0.75"
                            r="0.65"
                            fill="white"
                            opacity="0.14"
                          />
                        </pattern>
                        <pattern
                          id="editor-grid-major"
                          width="32"
                          height="32"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M32 0H0V32"
                            fill="none"
                            stroke="white"
                            strokeWidth="0.65"
                            opacity="0.09"
                          />
                        </pattern>
                      </defs>
                      <rect
                        width="100%"
                        height="100%"
                        fill="url(#editor-grid-minor)"
                      />
                      <rect
                        width="100%"
                        height="100%"
                        fill="url(#editor-grid-major)"
                      />
                    </svg>
                  )}

                  {/* Guide Lines from origin */}
                  {showGuides && (
                    <>
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ left: config.width / 2 }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ left: config.width / 3 }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ left: (2 * config.width) / 3 }}
                      />
                      <div
                        className="absolute left-0 right-0 h-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ top: config.height / 2 }}
                      />
                      <div
                        className="absolute left-0 right-0 h-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ top: config.height / 3 }}
                      />
                      <div
                        className="absolute left-0 right-0 h-px bg-[#7d2ae8]/30 pointer-events-none z-20"
                        style={{ top: (2 * config.height) / 3 }}
                      />
                    </>
                  )}

                  {/* Rectangle Selection Overlay */}
                  {isRectSelecting &&
                    rectStart &&
                    rectCurrent &&
                    (() => {
                      const rx = Math.min(rectStart.x, rectCurrent.x);
                      const ry = Math.min(rectStart.y, rectCurrent.y);
                      const rw = Math.abs(rectCurrent.x - rectStart.x);
                      const rh = Math.abs(rectCurrent.y - rectStart.y);
                      return (
                        <div
                          className="absolute z-30 border border-[#7d2ae8]/60 bg-[#7d2ae8]/10 pointer-events-none"
                          style={{ left: rx, top: ry, width: rw, height: rh }}
                        />
                      );
                    })()}

                  {/* Transparent interaction layer — SVG handles all display */}
                  {config.elements.map((el) => {
                    const isTextEditing =
                      el.type === "text" && editingId === el.id;
                    const textW = estimateTextWidth(
                      el.text || "",
                      el.fontSize || 16,
                    );
                    // Line: two-point model (x,y)=start, (x2,y2)=end
                    const lineEndX =
                      el.x2 !== undefined ? el.x2 : el.x + (el.lineWidth || 0);
                    const lineEndY =
                      el.y2 !== undefined ? el.y2 : el.y + (el.lineHeight || 0);
                    const isLine = el.type === "line";
                    const lineStroke = (el.lineStrokeWidth || 2) + 4; // hit-area thickness
                    const languageWidth = Math.max(
                      LANGUAGE_MIN_WIDTH,
                      Math.min(
                        LANGUAGE_MAX_WIDTH,
                        Math.round(
                          el.languageBarWidth ||
                            Math.min(400, config.width - 64),
                        ),
                      ),
                    );
                    const shapeWidth = Math.max(8, el.shapeWidth || 96);
                    const shapeHeight = Math.max(8, el.shapeHeight || 64);
                    const languageFontSize = Math.max(
                      10,
                      Math.round((el.fontSize || 16) * 0.6),
                    );
                    const languageLegend = getLanguageLegend(
                      displayStats.languages,
                      t("common.other"),
                      el.languageCount ?? DEFAULT_LANGUAGE_COUNT,
                    );
                    const languageNameWidths = languageLegend.map(
                      (lang) =>
                        Math.ceil(
                          estimateTextWidth(
                            `${lang.name} ${lang.percent}%`,
                            languageFontSize,
                            true,
                          ),
                        ) + 20,
                    );
                    let languageRows = 1;
                    let languageRowWidth = 0;
                    languageNameWidths.forEach((itemWidth) => {
                      if (
                        languageRowWidth > 0 &&
                        languageRowWidth + itemWidth > languageWidth
                      ) {
                        languageRows++;
                        languageRowWidth = itemWidth + 12;
                      } else {
                        languageRowWidth += itemWidth + 12;
                      }
                    });
                    const w =
                      el.type === "text"
                        ? textW + 4
                        : el.type === "avatar"
                          ? 52
                          : el.type === "line"
                            ? Math.max(lineStroke, Math.abs(lineEndX - el.x))
                            : el.type === "stats"
                              ? Math.min(300, config.width - el.x - 16)
                              : el.type === "stars"
                                ? Math.min(120, config.width - el.x - 16)
                                : el.type === "followers"
                                  ? Math.min(200, config.width - el.x - 16)
                                  : el.type === "contributions"
                                    ? Math.min(220, config.width - el.x - 16)
                                    : el.type === "rating"
                                      ? Math.min(80, config.width - el.x - 16)
                                      : el.type === "badge"
                                        ? Math.min(
                                            120,
                                            config.width - el.x - 16,
                                          )
                                        : el.type === "progress"
                                          ? el.progressBarWidth || 100
                                          : el.type === "calendar"
                                            ? Math.min(
                                                160,
                                                config.width - el.x - 16,
                                              )
                                            : el.type === "languages"
                                              ? languageWidth
                                              : el.type === "shape"
                                                ? shapeWidth
                                                : 20;
                    const h =
                      el.type === "text"
                        ? (el.fontSize || 16) + 8
                        : el.type === "avatar"
                          ? 52
                          : el.type === "line"
                            ? Math.max(lineStroke, Math.abs(lineEndY - el.y))
                            : el.type === "stats"
                              ? 90
                              : el.type === "stars"
                                ? 40
                                : el.type === "followers"
                                  ? 40
                                  : el.type === "contributions"
                                    ? 100
                                    : el.type === "rating"
                                      ? 80
                                      : el.type === "badge"
                                        ? 32
                                        : el.type === "progress"
                                          ? 30
                                          : el.type === "calendar"
                                            ? 24
                                            : el.type === "languages"
                                              ? Math.max(
                                                  44,
                                                  28 + languageRows * 20,
                                                )
                                              : el.type === "shape"
                                                ? shapeHeight
                                                : 20;
                    // Line container anchors at the min of both endpoints
                    const containerLeft = isLine
                      ? Math.min(el.x, lineEndX)
                      : el.x;
                    const containerTop =
                      el.type === "text"
                        ? el.y - (el.fontSize || 16) - 4
                        : el.type === "calendar"
                          ? el.y - (el.fontSize || 16)
                          : isLine
                            ? Math.min(el.y, lineEndY)
                            : el.y;
                    // Handle offsets relative to container
                    const startOffX = isLine ? el.x - containerLeft : 0;
                    const startOffY = isLine ? el.y - containerTop : 0;
                    const endOffX = isLine ? lineEndX - containerLeft : 0;
                    const endOffY = isLine ? lineEndY - containerTop : 0;
                    return (
                      <div
                        key={el.id}
                        data-el-id={el.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleElementMouseDown(e, el);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (el.type === "text") setEditingId(el.id);
                        }}
                        className={`absolute flex items-center justify-center ${el.locked ? "opacity-40 cursor-not-allowed" : selectedIds.includes(el.id) ? "cursor-move ring-1 ring-[#7d2ae8]/60" : "cursor-move hover:ring-1 hover:ring-white/20"} ${isTextEditing ? "" : ""}`}
                        style={{
                          left: containerLeft,
                          top: containerTop,
                          zIndex: selectedIds.includes(el.id) ? 10 : 1,
                          width: w > 0 ? w : undefined,
                          height: h > 0 ? h : undefined,
                        }}
                      >
                        {selectedIds.includes(el.id) &&
                          selectedIds.length === 1 && (
                            <div
                              className="absolute -top-8 left-0 flex items-center gap-0.5 bg-[#121217] border border-[#2a2a32] rounded-md px-1.5 py-1 shadow-lg z-50"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  saveToHistory();
                                  clipboardRef.current = [el];
                                  const offset = 12;
                                  setConfig((prev) => ({
                                    ...prev,
                                    elements: [
                                      ...prev.elements,
                                      {
                                        ...el,
                                        id: Math.random()
                                          .toString(36)
                                          .substr(2, 9),
                                        x: el.x + offset,
                                        y: el.y + offset,
                                        x2:
                                          el.x2 !== undefined
                                            ? el.x2 + offset
                                            : undefined,
                                        y2:
                                          el.y2 !== undefined
                                            ? el.y2 + offset
                                            : undefined,
                                      },
                                    ],
                                  }));
                                }}
                                className="p-0.5 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white"
                                title={t("actions.duplicate")}
                              >
                                <Copy size={11} />
                              </button>
                              <button
                                onClick={bringToFront}
                                className="p-0.5 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white"
                                title={t("actions.bringToFront")}
                              >
                                <BringToFront size={11} />
                              </button>
                              <button
                                onClick={sendToBack}
                                className="p-0.5 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-white"
                                title={t("actions.sendToBack")}
                              >
                                <SendToBack size={11} />
                              </button>
                              <button
                                onClick={toggleLock}
                                className={`p-0.5 hover:bg-[#2a2a32] rounded ${el.locked ? "text-[#7d2ae8]" : "text-zinc-400 hover:text-white"}`}
                                title={t("actions.toggleLock")}
                              >
                                {el.locked ? (
                                  <Lock size={11} />
                                ) : (
                                  <LockOpen size={11} />
                                )}
                              </button>
                              <div className="w-px h-3 bg-[#2a2a32] mx-0.5" />
                              <button
                                onClick={() => {
                                  saveToHistory();
                                  setConfig((prev) => ({
                                    ...prev,
                                    elements: prev.elements.filter(
                                      (e) => e.id !== el.id,
                                    ),
                                  }));
                                  setSelectedIds([]);
                                }}
                                className="p-0.5 hover:bg-[#2a2a32] rounded text-zinc-400 hover:text-red-400"
                                title={t("actions.delete")}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}

                        {selectedIds.includes(el.id) &&
                          !["line", "languages", "shape", "progress"].includes(
                            el.type,
                          ) && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saveToHistory();
                                setElementResizingId(el.id);
                              }}
                              className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-[#121217] bg-white shadow z-50 hover:bg-[#7d2ae8]"
                              title={t("inspector.fontSize")}
                            />
                          )}

                        {selectedIds.includes(el.id) &&
                          (el.type === "languages" ||
                            el.type === "progress") && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saveToHistory();
                                setElementResizingId(el.id);
                              }}
                              className="absolute -right-2 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm border border-[#121217] bg-white shadow z-50 hover:bg-[#7d2ae8]"
                              title={
                                el.type === "languages"
                                  ? t("inspector.languages.width")
                                  : t("inspector.progress.width")
                              }
                            />
                          )}

                        {selectedIds.includes(el.id) && el.type === "shape" && (
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              saveToHistory();
                              setElementResizingId(el.id);
                            }}
                            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-[#121217] bg-white shadow z-50 hover:bg-[#7d2ae8]"
                            title={`${t("inspector.width")} / ${t("inspector.height")}`}
                          />
                        )}

                        {/* Line endpoint handles — two independent draggable dots */}
                        {el.type === "line" && selectedIds.includes(el.id) && (
                          <>
                            <div
                              onMouseDown={(e) =>
                                handleEndpointMouseDown(e, el, "start")
                              }
                              className="absolute w-4 h-4 bg-[#7d2ae8] border-2 border-white rounded-full z-50 cursor-pointer hover:scale-125 transition-transform shadow"
                              style={{
                                left: startOffX - 8,
                                top: startOffY - 8,
                              }}
                              title={t("inspector.line.startPoint")}
                            />
                            <div
                              onMouseDown={(e) =>
                                handleEndpointMouseDown(e, el, "end")
                              }
                              className="absolute w-4 h-4 bg-[#7d2ae8] border-2 border-white rounded-full z-50 cursor-pointer hover:scale-125 transition-transform shadow"
                              style={{ left: endOffX - 8, top: endOffY - 8 }}
                              title={t("inspector.line.endPoint")}
                            />
                          </>
                        )}

                        {el.type === "text" && editingId === el.id ? (
                          <input
                            autoFocus
                            value={el.text}
                            onChange={(e) =>
                              updateSelected({ text: e.target.value })
                            }
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && setEditingId(null)
                            }
                            className="bg-[#0d1117]/90 outline-none border-none text-inherit px-1"
                            style={{
                              fontSize: el.fontSize,
                              color: el.color,
                              width: `${Math.ceil(estimateTextWidth(el.text || "", el.fontSize || 16)) + 12}px`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile right panel backdrop */}
      {showRightPanel && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setShowRightPanel(false)}
        />
      )}

      <aside
        className={`w-[280px] bg-[#121217] flex flex-col z-20 border-l border-[#2a2a32] md:relative md:flex md:pt-14 ${showRightPanel ? "fixed right-0 top-14 bottom-0 pt-4" : "hidden"} md:block`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-8 mt-4">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              {t("editor.settings")}
            </h3>
            <div className="space-y-4 px-1"></div>
          </section>

          {selectedIds.length > 0 && firstSelectedElement ? (
            <section className="space-y-6 animate-in slide-in-from-right-2">
              <div className="h-[1px] bg-[#2a2a32]" />
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase text-[#7d2ae8] tracking-widest">
                  {selectedIds.length > 1
                    ? `${selectedIds.length} ${t("editor.selection.items")}`
                    : t(ELEMENT_NAME_KEYS[firstSelectedElement.type])}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={bringToFront}
                    title={t("actions.bringToFront")}
                    className="text-zinc-500 hover:text-white"
                  >
                    <BringToFront size={12} />
                  </button>
                  <button
                    onClick={sendToBack}
                    title={t("actions.sendToBack")}
                    className="text-zinc-500 hover:text-white"
                  >
                    <SendToBack size={12} />
                  </button>
                  <button
                    onClick={toggleLock}
                    title={t("actions.toggleLock")}
                    className={`${firstSelectedElement.locked ? "text-[#7d2ae8]" : "text-zinc-500"} hover:text-white`}
                  >
                    {firstSelectedElement.locked ? (
                      <Lock size={12} />
                    ) : (
                      <LockOpen size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      saveToHistory();
                      setConfig((prev) => ({
                        ...prev,
                        elements: prev.elements.filter(
                          (el) => !selectedIds.includes(el.id),
                        ),
                      }));
                      setSelectedIds([]);
                    }}
                    className="text-zinc-500 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <details
                open
                className="rounded border border-[#2a2a32] bg-[#17171d]"
              >
                <summary className="cursor-pointer px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {t("inspector.position")}
                </summary>
                <div className="grid grid-cols-2 gap-4 border-t border-[#2a2a32] p-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">
                      X
                    </label>
                    <input
                      type="number"
                      step={snapTo8px ? 8 : 1}
                      value={firstSelectedElement.x}
                      onFocus={saveToHistory}
                      onChange={(e) =>
                        updateSelected({
                          x: snapValue(parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">
                      Y
                    </label>
                    <input
                      type="number"
                      step={snapTo8px ? 8 : 1}
                      value={firstSelectedElement.y}
                      onFocus={saveToHistory}
                      onChange={(e) =>
                        updateSelected({
                          y: snapValue(parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                    />
                  </div>
                </div>
              </details>

              <details
                open
                className="rounded border border-[#2a2a32] bg-[#17171d]"
              >
                <summary className="cursor-pointer px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {t("inspector.content")} / {t("inspector.appearance")}
                </summary>
                <div className="space-y-4 border-t border-[#2a2a32] p-3">
                  {firstSelectedElement.type !== "line" &&
                    firstSelectedElement.type !== "shape" && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.size")}
                        </label>
                        <input
                          type="number"
                          min={8}
                          max={200}
                          value={Math.round(
                            firstSelectedElement.fontSize || 16,
                          )}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              fontSize: Math.max(
                                8,
                                Math.min(200, parseInt(e.target.value) || 16),
                              ),
                            })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                        />
                      </div>
                    )}

                  {/* Badge controls */}
                  {firstSelectedElement.type === "badge" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.badge.labelText")}
                        </label>
                        <input
                          type="text"
                          value={firstSelectedElement.badgeText || ""}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({ badgeText: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.badge.color")}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border border-[#3a3a42] overflow-hidden relative">
                            <input
                              type="color"
                              value={
                                firstSelectedElement.badgeColor || "#7d2ae8"
                              }
                              onMouseDown={saveToHistory}
                              onChange={(e) =>
                                updateSelected({ badgeColor: e.target.value })
                              }
                              className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {firstSelectedElement.badgeColor || "#7d2ae8"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress controls */}
                  {firstSelectedElement.type === "progress" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.progress.label")}
                        </label>
                        <input
                          type="text"
                          value={firstSelectedElement.progressLabel || ""}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({ progressLabel: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.progress.value")}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={firstSelectedElement.progress ?? 50}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              progress: Math.max(
                                0,
                                Math.min(100, parseInt(e.target.value) || 0),
                              ),
                            })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.progress.color")}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border border-[#3a3a42] overflow-hidden relative">
                            <input
                              type="color"
                              value={
                                firstSelectedElement.progressColor || "#26a641"
                              }
                              onMouseDown={saveToHistory}
                              onChange={(e) =>
                                updateSelected({
                                  progressColor: e.target.value,
                                })
                              }
                              className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {firstSelectedElement.progressColor || "#26a641"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Calendar controls */}
                  {firstSelectedElement.type === "calendar" && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">
                        {t("inspector.calendar.format")}
                      </label>
                      <select
                        value={firstSelectedElement.calendarFormat || "both"}
                        onFocus={saveToHistory}
                        onChange={(e) =>
                          updateSelected({
                            calendarFormat: e.target
                              .value as CardElement["calendarFormat"],
                          })
                        }
                        className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded text-zinc-300"
                      >
                        <option value="both">
                          {t("inspector.calendar.both")}
                        </option>
                        <option value="date">
                          {t("inspector.calendar.dateOnly")}
                        </option>
                        <option value="relative">
                          {t("inspector.calendar.relativeOnly")}
                        </option>
                      </select>
                    </div>
                  )}

                  {/* Line controls */}
                  {firstSelectedElement.type === "line" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.style")}
                        </label>
                        <select
                          value={firstSelectedElement.lineStyle || "solid"}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              lineStyle: e.target
                                .value as CardElement["lineStyle"],
                            })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded text-zinc-300"
                        >
                          <option value="solid">{t("lineStyle.solid")}</option>
                          <option value="dotted">
                            {t("lineStyle.dotted")}
                          </option>
                          <option value="wavy">{t("lineStyle.wavy")}</option>
                          <option value="double">
                            {t("lineStyle.double")}
                          </option>
                          <option value="dash-dot">
                            {t("lineStyle.dashDot")}
                          </option>
                          <option value="double-dot">
                            {t("lineStyle.doubleDot")}
                          </option>
                          <option value="dashed">
                            {t("lineStyle.dashed")}
                          </option>
                          <option value="zigzag">
                            {t("lineStyle.zigzag")}
                          </option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.line.width")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={firstSelectedElement.lineWidth ?? 0}
                            onFocus={saveToHistory}
                            onChange={(e) =>
                              updateSelected({
                                lineWidth: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.line.thickness")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={firstSelectedElement.lineStrokeWidth ?? 2}
                            onFocus={saveToHistory}
                            onChange={(e) =>
                              updateSelected({
                                lineStrokeWidth: Math.max(
                                  1,
                                  parseInt(e.target.value) || 2,
                                ),
                              })
                            }
                            className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress bar width */}
                  {firstSelectedElement.type === "progress" && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">
                        {t("inspector.progress.width")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={snapTo8px ? 8 : 1}
                        value={firstSelectedElement.progressBarWidth ?? 0}
                        onFocus={saveToHistory}
                        onChange={(e) =>
                          updateSelected({
                            progressBarWidth: snapValue(
                              parseInt(e.target.value) || 0,
                            ),
                          })
                        }
                        className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                      />
                    </div>
                  )}

                  {firstSelectedElement.type === "languages" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.languages.count")}
                        </label>
                        <select
                          value={
                            firstSelectedElement.languageCount ??
                            DEFAULT_LANGUAGE_COUNT
                          }
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              languageCount: Math.max(
                                1,
                                Math.min(
                                  MAX_LANGUAGE_COUNT,
                                  parseInt(e.target.value) ||
                                    DEFAULT_LANGUAGE_COUNT,
                                ),
                              ),
                            })
                          }
                          className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs text-zinc-300"
                        >
                          {Array.from(
                            { length: MAX_LANGUAGE_COUNT },
                            (_, index) => index + 1,
                          ).map((count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ))}
                        </select>
                        <p className="text-[8px] text-zinc-600">
                          {t("inspector.languages.countHint")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.languages.width")}
                        </label>
                        <input
                          type="range"
                          min={LANGUAGE_MIN_WIDTH}
                          max={LANGUAGE_MAX_WIDTH}
                          step={snapTo8px ? 8 : 1}
                          value={Math.max(
                            LANGUAGE_MIN_WIDTH,
                            Math.min(
                              LANGUAGE_MAX_WIDTH,
                              firstSelectedElement.languageBarWidth ||
                                Math.min(400, config.width - 64),
                            ),
                          )}
                          onMouseDown={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              languageBarWidth: Math.max(
                                LANGUAGE_MIN_WIDTH,
                                Math.min(
                                  LANGUAGE_MAX_WIDTH,
                                  parseInt(e.target.value),
                                ),
                              ),
                            })
                          }
                          className="w-full accent-[#7d2ae8]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={LANGUAGE_MIN_WIDTH}
                          max={LANGUAGE_MAX_WIDTH}
                          step={snapTo8px ? 8 : 1}
                          value={Math.max(
                            LANGUAGE_MIN_WIDTH,
                            Math.min(
                              LANGUAGE_MAX_WIDTH,
                              firstSelectedElement.languageBarWidth ||
                                Math.min(400, config.width - 64),
                            ),
                          )}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              languageBarWidth: Math.max(
                                LANGUAGE_MIN_WIDTH,
                                Math.min(
                                  LANGUAGE_MAX_WIDTH,
                                  snapValue(
                                    parseInt(e.target.value) ||
                                      LANGUAGE_MIN_WIDTH,
                                  ),
                                ),
                              ),
                            })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#1e1e24] border border-[#2a2a32] rounded"
                        />
                        <button
                          onClick={() => {
                            saveToHistory();
                            updateSelected({ languageBarWidth: undefined });
                          }}
                          className="rounded border border-[#2a2a32] px-2 py-1.5 text-[9px] font-bold text-zinc-500 hover:bg-[#2a2a32] hover:text-white"
                        >
                          {t("common.auto")}
                        </button>
                      </div>
                      <p className="text-[8px] text-zinc-600">
                        {t("inspector.languages.widthHint")}
                      </p>
                    </div>
                  )}

                  {firstSelectedElement.type === "shape" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">
                          {t("inspector.shape.type")}
                        </label>
                        <select
                          value={firstSelectedElement.shapeType || "rectangle"}
                          onFocus={saveToHistory}
                          onChange={(e) =>
                            updateSelected({
                              shapeType: e.target
                                .value as CardElement["shapeType"],
                            })
                          }
                          className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs text-zinc-300"
                        >
                          {SHAPE_PRESETS.map((preset) => (
                            <option key={preset.type} value={preset.type}>
                              {t(preset.label)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.width")}
                          </label>
                          <input
                            type="number"
                            min={8}
                            max={1200}
                            step={snapTo8px ? 8 : 1}
                            value={firstSelectedElement.shapeWidth || 96}
                            onFocus={saveToHistory}
                            onChange={(e) => {
                              const value = Math.max(
                                8,
                                Math.min(
                                  1200,
                                  snapValue(parseInt(e.target.value) || 8),
                                ),
                              );
                              updateSelected(
                                firstSelectedElement.shapeType === "circle"
                                  ? { shapeWidth: value, shapeHeight: value }
                                  : { shapeWidth: value },
                              );
                            }}
                            className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.height")}
                          </label>
                          <input
                            type="number"
                            min={8}
                            max={1200}
                            step={snapTo8px ? 8 : 1}
                            value={firstSelectedElement.shapeHeight || 64}
                            onFocus={saveToHistory}
                            onChange={(e) => {
                              const value = Math.max(
                                8,
                                Math.min(
                                  1200,
                                  snapValue(parseInt(e.target.value) || 8),
                                ),
                              );
                              updateSelected(
                                firstSelectedElement.shapeType === "circle"
                                  ? { shapeWidth: value, shapeHeight: value }
                                  : { shapeHeight: value },
                              );
                            }}
                            className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.shape.strokeColor")}
                          </label>
                          <input
                            type="color"
                            value={
                              firstSelectedElement.shapeStrokeColor || "#ffffff"
                            }
                            onMouseDown={saveToHistory}
                            onChange={(e) =>
                              updateSelected({
                                shapeStrokeColor: e.target.value,
                              })
                            }
                            className="h-8 w-full cursor-pointer rounded border border-[#2a2a32] bg-[#1e1e24]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.shape.strokeWidth")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={firstSelectedElement.shapeStrokeWidth || 0}
                            onFocus={saveToHistory}
                            onChange={(e) =>
                              updateSelected({
                                shapeStrokeWidth: Math.max(
                                  0,
                                  Math.min(20, parseInt(e.target.value) || 0),
                                ),
                              })
                            }
                            className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      {[
                        "rectangle",
                        "rounded-rectangle",
                        "speech-bubble",
                      ].includes(
                        firstSelectedElement.shapeType || "rectangle",
                      ) && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">
                            {t("inspector.shape.cornerRadius")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={firstSelectedElement.shapeRadius || 0}
                            onFocus={saveToHistory}
                            onChange={(e) =>
                              updateSelected({
                                shapeRadius: Math.max(
                                  0,
                                  Math.min(200, parseInt(e.target.value) || 0),
                                ),
                              })
                            }
                            className="w-full rounded border border-[#2a2a32] bg-[#1e1e24] px-2 py-1.5 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </section>
          ) : (
            <div className="mt-20 flex flex-col items-center justify-center text-zinc-600 gap-4 text-center">
              <MousePointer2 size={24} className="opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                {t("editor.ready")}
              </p>
            </div>
          )}

        </div>
      </aside>
    </div>
  );
}

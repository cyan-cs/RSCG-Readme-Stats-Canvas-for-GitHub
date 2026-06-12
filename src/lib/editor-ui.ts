import type { CardConfig } from "./svg-engine";

export const MIN_PREVIEW_ZOOM = 0.25;
export const MAX_PREVIEW_ZOOM = 2;
export const PREVIEW_ZOOM_STEP = 0.1;

export function clampPreviewZoom(value: number): number {
  return Math.max(
    MIN_PREVIEW_ZOOM,
    Math.min(MAX_PREVIEW_ZOOM, Math.round(value * 10) / 10),
  );
}

export function calculatePreviewFitZoom(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = 48,
): number {
  const availableWidth = Math.max(1, viewportWidth - padding);
  const availableHeight = Math.max(1, viewportHeight - padding);
  return clampPreviewZoom(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  );
}

export function configFingerprint(config: CardConfig): string {
  return JSON.stringify(config);
}

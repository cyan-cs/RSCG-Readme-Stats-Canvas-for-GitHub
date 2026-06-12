const PUBLIC_APP_URL = "https://rscg.cy-an.net";

export function buildLinkedCardMarkdown(imageUrl: string): string {
  return `[![GitHub Stats Card](${imageUrl})](${PUBLIC_APP_URL})`;
}

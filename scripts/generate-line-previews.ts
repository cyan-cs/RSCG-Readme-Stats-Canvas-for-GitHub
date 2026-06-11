import fs from "node:fs";
import path from "node:path";

const styles = [
  "solid",
  "dotted",
  "wavy",
  "double",
  "dash-dot",
  "double-dot",
  "dashed",
  "zigzag",
] as const;
const thicknesses = [1, 2, 3, 5, 8];
const colorMap: Record<string, string> = {
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

function svgContent(style: string, sw: number, color: string): string {
  const c = color;
  switch (style) {
    case "solid":
      return `<line x1="0" y1="8" x2="80" y2="8" stroke="${c}" stroke-width="${sw}"/>`;
    case "dotted":
      return `<line x1="0" y1="8" x2="80" y2="8" stroke="${c}" stroke-width="${sw}" stroke-dasharray="4 4"/>`;
    case "wavy":
      return `<path d="M 0 8 Q 10 0, 20 8 T 40 8 T 60 8 T 80 8" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    case "double": {
      const off = Math.max(2, sw * 0.6);
      const sw2 = Math.max(1, sw * 0.6);
      return `<line x1="0" y1="${8 - off}" x2="80" y2="${8 - off}" stroke="${c}" stroke-width="${sw2}"/><line x1="0" y1="${8 + off}" x2="80" y2="${8 + off}" stroke="${c}" stroke-width="${sw2}"/>`;
    }
    case "dash-dot":
      return `<line x1="0" y1="8" x2="80" y2="8" stroke="${c}" stroke-width="${sw}" stroke-dasharray="10 4 2 4"/>`;
    case "double-dot": {
      const off2 = Math.max(2, sw * 0.6);
      const sw3 = Math.max(1, sw * 0.6);
      return `<line x1="0" y1="${8 - off2}" x2="80" y2="${8 - off2}" stroke="${c}" stroke-width="${sw3}" stroke-dasharray="4 4"/><line x1="0" y1="${8 + off2}" x2="80" y2="${8 + off2}" stroke="${c}" stroke-width="${sw3}" stroke-dasharray="4 4"/>`;
    }
    case "dashed":
      return `<line x1="0" y1="8" x2="80" y2="8" stroke="${c}" stroke-width="${sw}" stroke-dasharray="12 6"/>`;
    case "zigzag":
      return `<polyline points="0,8 10,0 20,8 30,0 40,8 50,0 60,8 70,0 80,8" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    default:
      return "";
  }
}

const baseDir = "public/line-previews";
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

let count = 0;
for (const sw of thicknesses) {
  const dir = path.join(baseDir, String(sw));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const [hex, name] of Object.entries(colorMap)) {
    for (const style of styles) {
      const inner = svgContent(style, sw, hex);
      const full = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="16">${inner}</svg>`;
      fs.writeFileSync(path.join(dir, `${style}-${name}.svg`), full);
      count++;
    }
  }
}
console.log(`Generated ${count} line preview SVGs`);

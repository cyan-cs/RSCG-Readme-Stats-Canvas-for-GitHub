import fs from "node:fs";
import path from "node:path";

interface CardElement {
  type: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  text?: string;
  lineWidth?: number;
  badgeColor?: string;
  badgeText?: string;
  progress?: number;
  progressLabel?: string;
  progressColor?: string;
}

interface TemplateConfig {
  bgColor?: string;
  borderColor?: string;
  width?: number;
  height?: number;
  elements: CardElement[];
}

const templatesDir = path.resolve("public/templates");

const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const json: TemplateConfig = JSON.parse(
    fs.readFileSync(path.join(templatesDir, file), "utf-8"),
  );
  const { bgColor, borderColor, width, height, elements } = json;

  let body = "";

  for (const el of elements) {
    const { type, x, y, color = "#ffffff", fontSize = 14 } = el;

    switch (type) {
      case "text":
        body += `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${Math.max(8, fontSize)}" font-weight="bold">${el.text || ""}</text>`;
        break;
      case "stats":
        body += `<rect x="${x}" y="${y}" width="200" height="30" rx="4" fill="#ffffff" opacity="0.1" />`;
        break;
      case "languages":
        body += `<rect x="${x}" y="${y}" width="180" height="8" rx="4" fill="#ffffff" opacity="0.15" />`;
        body += `<rect x="${x}" y="${y + 14}" width="120" height="6" rx="3" fill="#ffffff" opacity="0.1" />`;
        break;
      case "stars":
      case "followers":
        body += `<rect x="${x}" y="${y}" width="100" height="24" rx="4" fill="#ffffff" opacity="0.1" />`;
        break;
      case "line":
        body += `<line x1="${x}" y1="${y}" x2="${x + (el.lineWidth || 200)}" y2="${y}" stroke="${color}" stroke-width="2" opacity="0.5" />`;
        break;
      case "badge": {
        const bh = Math.max(16, fontSize + 6);
        body += `<rect x="${x}" y="${y}" width="50" height="${bh}" rx="10" fill="${el.badgeColor || "#7d2ae8"}" />`;
        body += `<text x="${x + 25}" y="${y + bh / 2}" fill="white" font-family="Arial,sans-serif" font-size="${Math.max(8, fontSize - 4)}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${el.badgeText || ""}</text>`;
        break;
      }
      case "progress":
        body += `<rect x="${x}" y="${y}" width="100" height="8" rx="4" fill="#30363d" />`;
        body += `<rect x="${x}" y="${y}" width="${el.progress || 50}" height="8" rx="4" fill="${el.progressColor || "#7d2ae8"}" />`;
        break;
      case "avatar":
        body += `<circle cx="${x + 25}" cy="${y + 25}" r="25" fill="#30363d" />`;
        body += `<circle cx="${x + 25}" cy="${y + 25}" r="10" fill="#ffffff" opacity="0.2" />`;
        break;
      case "calendar":
        body += `<rect x="${x}" y="${y}" width="150" height="20" rx="3" fill="#ffffff" opacity="0.1" />`;
        break;
      case "rating":
        body += `<text x="${x}" y="${y + fontSize}" fill="${color}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold">AA</text>`;
        break;
      case "contributions":
        body += `<rect x="${x}" y="${y}" width="120" height="40" rx="3" fill="#ffffff" opacity="0.08" />`;
        break;
    }
  }

  const svg = `<svg width="${width || 495}" height="${height || 200}" viewBox="0 0 ${width || 495} ${height || 200}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor || "#0d1117"}" rx="6" />
  <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="${borderColor || "#30363d"}" stroke-width="1" rx="6" />
  ${body}
</svg>`;

  const svgPath = path.join(templatesDir, file.replace(".json", ".svg"));
  fs.writeFileSync(svgPath, svg);
  console.log(`Generated: ${svgPath}`);
}

console.log("All template previews generated.");

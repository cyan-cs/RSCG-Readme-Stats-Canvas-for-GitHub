import { NextResponse } from "next/server";
import { generateSVG, CardConfig } from "@/lib/svg-engine";

export async function GET() {
  const config: CardConfig = {
    username: "RSCG",
    bgColor: "#0d1117",
    borderColor: "#30363d",
    width: 495,
    height: 200,
    elements: [
      {
        id: "1",
        type: "text",
        x: 24,
        y: 45,
        text: "RSCG",
        fontSize: 28,
        visible: true,
        color: "#7d2ae8",
      },
      {
        id: "2",
        type: "text",
        x: 24,
        y: 90,
        text: "Readme Stats Canvas for GitHub",
        fontSize: 14,
        visible: true,
        color: "#8b949e",
      },
      {
        id: "3",
        type: "stats",
        x: 24,
        y: 130,
        fontSize: 13,
        visible: true,
        color: "#ffffff",
      },
    ],
  };

  const svg = generateSVG(config, null);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

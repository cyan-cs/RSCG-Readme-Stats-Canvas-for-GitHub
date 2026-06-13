import { ImageResponse } from "next/og";
import {
  formatMetricCount,
  getPublicSiteMetrics,
  type PublicSiteMetrics,
} from "@/lib/site-metrics";

export const runtime = "nodejs";

const EMPTY_METRICS: PublicSiteMetrics = {
  successfulSignIns: 0,
};

async function loadMetrics(): Promise<PublicSiteMetrics> {
  try {
    return await getPublicSiteMetrics();
  } catch (error) {
    console.error("[og] Failed to load site metrics:", error);
    return EMPTY_METRICS;
  }
}

export async function GET() {
  const metrics = await loadMetrics();
  const loginCount = formatMetricCount(metrics.successfulSignIns);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 83% 18%, #542190 0%, #21102f 28%, #0a0a11 68%)",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          left: -180,
          bottom: -250,
          borderRadius: 999,
          background: "#7d2ae8",
          opacity: 0.16,
        }}
      />
      <div
        style={{
          width: "52%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "62px 38px 62px 72px",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 28 }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "linear-gradient(145deg, #a855f7, #6d28d9)",
              boxShadow: "0 14px 40px rgba(125,42,232,0.38)",
              fontSize: 25,
              fontWeight: 900,
            }}
          >
            R
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              fontSize: 25,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            RSCG
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 57,
            lineHeight: 1.04,
            fontWeight: 900,
            letterSpacing: "-0.045em",
          }}
        >
          <span>Build a GitHub</span>
          <span style={{ color: "#b985ff" }}>profile that stands out.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            maxWidth: 500,
            color: "#aaa4b5",
            fontSize: 22,
            lineHeight: 1.45,
          }}
        >
          Design dynamic stats cards visually, then publish them directly to
          your README.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 36,
            padding: "18px 22px",
            width: 390,
            borderRadius: 16,
            border: "1px solid rgba(185,133,255,0.28)",
            background: "rgba(125,42,232,0.11)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                color: "#8f879a",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.13em",
              }}
            >
              SUCCESSFUL LOGINS
            </span>
            <span
              style={{
                marginTop: 4,
                color: "#ffffff",
                fontSize: 35,
                fontWeight: 900,
              }}
            >
              {loginCount}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              width: 54,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: "#7d2ae8",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            ↗
          </div>
        </div>
      </div>

      <div
        style={{
          width: "48%",
          display: "flex",
          alignItems: "center",
          paddingRight: 60,
        }}
      >
        <div
          style={{
            width: 510,
            height: 430,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.13)",
            background: "#14131a",
            boxShadow: "0 35px 90px rgba(0,0,0,0.52)",
            transform: "rotate(-2deg)",
          }}
        >
          <div
            style={{
              height: 58,
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              borderBottom: "1px solid #2c2934",
              background: "#191820",
            }}
          >
            <div style={{ display: "flex" }}>
              {["#ff6b6b", "#ffd43b", "#51cf66"].map((color) => (
                <div
                  key={color}
                  style={{
                    width: 11,
                    height: 11,
                    marginRight: 8,
                    borderRadius: 999,
                    background: color,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: 18,
                color: "#8f8999",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              README CARD EDITOR
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                padding: "8px 14px",
                borderRadius: 8,
                background: "#7d2ae8",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Publish
            </div>
          </div>
          <div style={{ flex: 1, display: "flex" }}>
            <div
              style={{
                width: 58,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 22,
                borderRight: "1px solid #292630",
                background: "#111016",
              }}
            >
              {["T", "◇", "≋", "★"].map((icon, index) => (
                <div
                  key={icon}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    borderRadius: 8,
                    background: index === 0 ? "#7d2ae8" : "transparent",
                    color: index === 0 ? "#ffffff" : "#77717e",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at center, #25222d 0%, #1b1921 70%)",
              }}
            >
              <div
                style={{
                  width: 390,
                  height: 245,
                  display: "flex",
                  flexDirection: "column",
                  padding: 27,
                  borderRadius: 18,
                  border: "1px solid #3a3542",
                  background:
                    "linear-gradient(145deg, #15131c 0%, #0d0c12 100%)",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.42)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#b985ff",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  cyan-cs&apos;s Stats
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 21,
                    color: "#e7e3eb",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  1,248 commits · 156 stars · 42 repositories
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 12,
                    marginTop: 26,
                    overflow: "hidden",
                    borderRadius: 999,
                    background: "#28242f",
                  }}
                >
                  <div style={{ width: "58%", background: "#3178c6" }} />
                  <div style={{ width: "28%", background: "#f1e05a" }} />
                  <div style={{ width: "14%", background: "#a97bff" }} />
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 18,
                    color: "#918a9b",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  TypeScript 58%　 JavaScript 28%　 Kotlin 14%
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: "auto",
                    color: "#5f5968",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                  }}
                >
                  MADE WITH RSCG
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}

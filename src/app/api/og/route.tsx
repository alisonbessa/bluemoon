import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "HiveBudget";
  const description = searchParams.get("description") || "Controle Financeiro Colaborativo";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d1b69 50%, #1e3a5f 100%)",
          padding: "60px 80px",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "#f59e0b",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "16px",
              fontSize: "28px",
            }}
          >
            🐝
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#f59e0b",
            }}
          >
            HiveBudget
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "24px",
            color: "#d1d5db",
            lineHeight: 1.4,
            maxWidth: "800px",
          }}
        >
          {description}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            right: "80px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: "18px" }}>
            hivebudget.com
          </span>
          <span style={{ color: "#9ca3af", fontSize: "18px" }}>
            Controle Financeiro Colaborativo
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

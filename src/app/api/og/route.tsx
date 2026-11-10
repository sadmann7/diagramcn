import { ImageResponse } from "next/og";

import { getInspectSummary, inspectRegistry } from "@/lib/registry/inspect";

const size = { width: 1200, height: 630 };

export async function GET(req: Request) {
  const specifier = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const result = specifier ? await inspectRegistry(specifier) : null;
  const summary = result ? getInspectSummary(result) : null;

  const stats = summary
    ? [
        ["items", summary.items],
        ["files", summary.files],
        ["packages", summary.dependencies],
        ["errors", summary.errors],
        ["warnings", summary.warnings],
      ]
    : [];

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: "#09090b",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 32, color: "#a1a1aa" }}>
        diagramcn
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa" }}>
          shadcn add
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          {result?.specifiers.join(" + ") ?? specifier}
        </div>
      </div>
      <div style={{ display: "flex", gap: 56 }}>
        {stats.map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 700,
                color:
                  label === "errors" && Number(value) > 0
                    ? "#f87171"
                    : label === "warnings" && Number(value) > 0
                      ? "#fbbf24"
                      : "#fafafa",
              }}
            >
              {String(value)}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

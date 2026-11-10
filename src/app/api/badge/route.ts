import { getInspectSummary, inspectRegistry } from "@/lib/registry/inspect";

function getTextWidth(text: string) {
  return Math.round(text.length * 6.6 + 12);
}

function renderBadge(label: string, message: string, color: string) {
  const labelWidth = getTextWidth(label);
  const messageWidth = getTextWidth(message);
  const width = labelWidth + messageWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#18181b"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>`;
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const result = query ? await inspectRegistry(query) : null;

  let message = "not found";
  let color = "#71717a";

  if (result) {
    const summary = getInspectSummary(result);
    if (summary.errors > 0) {
      message = `${summary.errors} error${summary.errors === 1 ? "" : "s"}`;
      color = "#dc2626";
    } else if (summary.warnings > 0) {
      message = `${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`;
      color = "#d97706";
    } else {
      message = `${summary.items} item${summary.items === 1 ? "" : "s"} · ${summary.files} files`;
      color = "#16a34a";
    }
  }

  return new Response(renderBadge("diagramcn", message, color), {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

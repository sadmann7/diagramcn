"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import mermaid, { type MermaidConfig } from "mermaid";
import * as React from "react";

interface MermaidDiagramProps extends React.ComponentProps<"div"> {
  chart: string;
  theme?: MermaidConfig["theme"];
}

export function MermaidDiagram({
  chart,
  theme = "neutral",
  className,
  ...props
}: MermaidDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    async function renderDiagram() {
      try {
        setLoading(true);
        setError(null);

        mermaid.initialize({
          startOnLoad: false,
          theme: theme,
          htmlLabels: true,
          securityLevel: "strict",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            nodeSpacing: 50,
            rankSpacing: 50,
            padding: 15,
            useMaxWidth: true,
          },
          sequence: {
            useMaxWidth: true,
            boxMargin: 10,
            mirrorActors: false,
            bottomMarginAdj: 10,
          },
          gantt: {
            useMaxWidth: true,
            leftPadding: 75,
          },
          themeCSS: `
            .node rect,
            .node circle,
            .node polygon,
            .node path {
              transition: background-color 0.3s ease;
            }
            .edgePath path {
              transition: stroke-width 0.3s ease, stroke 0.3s ease;
            }
            .node:hover rect,
            .node:hover circle,
            .node:hover polygon {
              fill: var(--color-muted);
            }
            .edgePath:hover path {
              stroke-width: 2px;
              stroke: var(--color-foreground);
            }
            .cluster rect {
              transition: background-color 0.3s ease;
            }
            .cluster:hover rect {
              fill: var(--color-muted);
            }
            .label {
              font-family: var(--font-sans);
            }
          `,
        });

        if (containerRef.current) {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
          containerRef.current.innerHTML = svg;
        }

        setLoading(false);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err as Error);
        setLoading(false);
      }
    }

    void renderDiagram();
  }, [chart, theme]);

  const onZoomIn = React.useCallback(
    () => setZoom((prev) => Math.min(prev + 0.1, 2)),
    [],
  );
  const onZoomOut = React.useCallback(
    () => setZoom((prev) => Math.max(prev - 0.1, 0.5)),
    [],
  );
  const onResetZoom = React.useCallback(() => setZoom(1), []);

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="h-6 w-6 animate-spin rounded-full border-current border-b-2" />
        </div>
      )}
      {error && (
        <div
          className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
          role="alert"
        >
          <h3 className="font-semibold">Error rendering diagram</h3>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      )}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-background/90 p-2 shadow-sm backdrop-blur">
        <Button
          className="rounded p-1 hover:bg-muted"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
        >
          <MinusIcon />
        </Button>
        <Button
          onClick={onResetZoom}
          className="rounded px-2 text-sm hover:bg-muted"
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          onClick={onZoomIn}
          className="rounded p-1 hover:bg-muted"
          aria-label="Zoom in"
          disabled={zoom >= 2}
        >
          <PlusIcon />
        </Button>
      </div>
      <div
        ref={containerRef}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center top",
        }}
        className={cn("transition-transform duration-200", className)}
        {...props}
      >
        <div key={chart} className={cn("mermaid", loading && "invisible")}>
          {chart}
        </div>
      </div>
    </div>
  );
}

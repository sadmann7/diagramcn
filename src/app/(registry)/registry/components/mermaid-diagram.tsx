"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Maximize, MinusIcon, PlusIcon } from "lucide-react";
import mermaid, { type MermaidConfig } from "mermaid";
import * as React from "react";
import svgPanZoom from "svg-pan-zoom";

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
  const panZoomRef = React.useRef<SvgPanZoom.Instance | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const currentContainer = containerRef.current;
    let panZoomInstance: SvgPanZoom.Instance | null = null;

    async function onDiagramLoad() {
      if (panZoomRef.current) {
        try {
          panZoomRef.current.destroy();
        } catch (error) {
          console.error("Error destroying previous panZoom instance:", error);
        }
        panZoomRef.current = null;
      }

      if (currentContainer) {
        currentContainer.innerHTML = "";
      }

      try {
        setIsLoading(true);
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

        if (currentContainer) {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);

          if (containerRef.current === currentContainer) {
            currentContainer.innerHTML = svg;

            const svgElement = currentContainer.querySelector("svg");
            if (svgElement) {
              svgElement.setAttribute("width", "100%");
              svgElement.setAttribute("height", "100%");
              svgElement.style.maxWidth = "none";

              panZoomInstance = svgPanZoom(svgElement, {
                zoomEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.5,
                maxZoom: 8,
                preventMouseEventsDefault: true,
              });

              panZoomRef.current = panZoomInstance;

              panZoomInstance.resize();
              panZoomInstance.fit();
              panZoomInstance.center();
            } else {
              console.warn("Could not find SVG element after rendering.");
            }
          } else {
            console.warn("Container ref changed during async render.");
          }
        } else {
          console.warn("Container ref was initially null.");
        }

        setIsLoading(false);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to render diagram",
        );
        setIsLoading(false);

        if (panZoomRef.current) {
          console.log("Destroying panZoom instance after error");
          try {
            panZoomRef.current.destroy();
          } catch (error) {
            console.error(
              "Error destroying panZoom instance after error:",
              error,
            );
          }
          panZoomRef.current = null;
        }

        if (currentContainer && containerRef.current === currentContainer) {
          currentContainer.innerHTML = "";
        }
      }
    }

    void onDiagramLoad();

    return () => {
      console.log("Running MermaidDiagram cleanup...");

      if (panZoomInstance) {
        try {
          panZoomInstance.destroy();
        } catch (error) {
          console.error("Error destroying panZoomInstance in cleanup:", error);
        }
        panZoomInstance = null;
      }

      if (panZoomRef.current) {
        panZoomRef.current = null;
      }

      if (currentContainer) {
        try {
          currentContainer.innerHTML = "";
        } catch (e) {
          console.error("Error clearing captured container innerHTML:", e);
        }
      }

      if (containerRef.current && containerRef.current !== currentContainer) {
        try {
          containerRef.current.innerHTML = "";
        } catch (error) {
          console.error("Error clearing current container innerHTML:", error);
        }
      }
    };
  }, [chart, theme]);

  const onZoomIn = React.useCallback(() => {
    panZoomRef.current?.zoomIn();
  }, []);

  const onZoomOut = React.useCallback(() => {
    panZoomRef.current?.zoomOut();
  }, []);

  const onResetView = React.useCallback(() => {
    panZoomRef.current?.reset();
  }, []);

  return (
    <div className="relative size-full overflow-hidden">
      {isLoading ? (
        <div
          role="status"
          className="absolute inset-0 z-20 flex items-center justify-center bg-background/50"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-current border-b-2" />
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 z-20 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
        >
          <h3 className="font-semibold">Error rendering diagram</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : null}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="absolute top-4 right-4 z-10 flex items-center rounded bg-accent/60 shadow-md backdrop-blur-sm"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-r-none dark:hover:bg-accent/80"
              onClick={onZoomOut}
              disabled={isLoading || !!error}
            >
              <MinusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Zoom out</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-none dark:hover:bg-accent/80"
              onClick={onResetView}
              disabled={isLoading || !!error}
            >
              <Maximize />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Reset view</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-l-none dark:hover:bg-accent/80"
              onClick={onZoomIn}
              disabled={isLoading || !!error}
            >
              <PlusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Zoom in</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        ref={containerRef}
        className={cn("size-full", className)}
        {...props}
        style={{
          visibility: isLoading ? "hidden" : "visible",
          height: "100%",
          width: "100%",
        }}
      />
    </div>
  );
}

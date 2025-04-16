"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlignCenterIcon, Maximize, MinusIcon, PlusIcon } from "lucide-react";
import mermaid, { type MermaidConfig } from "mermaid";
import * as React from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

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
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function onDiagramLoad() {
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

        if (containerRef.current) {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
          containerRef.current.innerHTML = svg;
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    }

    void onDiagramLoad();
  }, [chart, theme]);

  return (
    <div className="relative size-full">
      {isLoading ? (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-background/50"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-current border-b-2" />
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
        >
          <h3 className="font-semibold">Error rendering diagram</h3>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : null}
      <TransformWrapper
        initialScale={4}
        limitToBounds={false}
        minScale={2}
        maxScale={8}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <React.Fragment>
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
                    onClick={() => zoomOut(0.2)}
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
                    onClick={() => {
                      resetTransform();
                      centerView();
                    }}
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
                    onClick={() => zoomIn(0.2)}
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
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%" }}
            >
              <div
                ref={containerRef}
                className={cn(
                  "mx-auto flex items-center justify-center",
                  className,
                )}
                {...props}
              >
                <div
                  key={chart}
                  className={cn("mermaid max-w-full", isLoading && "invisible")}
                >
                  {chart}
                </div>
              </div>
            </TransformComponent>
          </React.Fragment>
        )}
      </TransformWrapper>
    </div>
  );
}

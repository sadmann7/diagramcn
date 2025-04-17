"use client";

import { ActionButton } from "@/components/action-button";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RegistryItem } from "@/lib/validations/registry";
import { Check, Copy, Download, Maximize, Minus, Plus } from "lucide-react";
import mermaid, { type MermaidConfig } from "mermaid";
import * as React from "react";
import { toast } from "sonner";
import svgPanZoom from "svg-pan-zoom";

interface MermaidDiagramProps extends React.ComponentProps<"div"> {
  code: string;
  registryData: RegistryItem;
  theme?: MermaidConfig["theme"];
  isPending: boolean;
}

export function MermaidDiagram({
  code,
  registryData,
  theme = "neutral",
  className,
  isPending,
  ...props
}: MermaidDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panZoomRef = React.useRef<SvgPanZoom.Instance | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showNodeDialog, setShowNodeDialog] = React.useState(false);
  const [selectedNodePath, setSelectedNodePath] = React.useState<string | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = React.useState<
    NonNullable<RegistryItem["files"]>[number] | null
  >(null);
  const [isCopied, setIsCopied] = React.useState(false);

  const isGenerating = isPending || isLoading;

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
            .node {
              cursor: pointer;
              user-select: none;
            }
            .node rect,
            .node circle,
            .node polygon,
            .node path {
              fill: var(--canvas);
              stroke: var(--border);
              stroke-width: 2px;
              transition: stroke 0.3s ease;
            }
            .edgePath path {
              transition: stroke-width 0.3s ease, stroke 0.3s ease;
            }
            .node:hover rect,
            .node:hover circle,
            .node:hover polygon,
            .node:hover path {
              stroke: var(--ring);
            }
            .edgePath:hover path {
              stroke-width: 2px;
              stroke: var(--accent-foreground);
            }
            .cluster {
              cursor: pointer;
              user-select: none;
            }
            .cluster rect {
              stroke: var(--border);
              stroke-width: 2px;
              transition: stroke 0.3s ease;
            }
            .cluster:hover rect {
              stroke: oklch(62.3% 0.214 259.815);
            }
            .label {
              font-family: var(--font-sans);
              user-select: none;
            }
            .nodeLabel {
              color: var(--canvas-foreground);
            }
            .edgeLabel {
              user-select: none;
            }
          `,
        });

        if (currentContainer) {
          const { svg } = await mermaid.render(
            `mermaid-${crypto.randomUUID()}`,
            code,
          );

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

              const nodes = currentContainer.querySelectorAll(".node");
              for (const node of nodes) {
                const nodeId = node.id;
                const nodeElement = node;
                if (nodeId) {
                  nodeElement.addEventListener("click", () => {
                    const path =
                      nodeElement.querySelector("title")?.textContent ??
                      nodeElement.getAttribute("title") ??
                      null;

                    setSelectedNodePath(path);
                    setShowNodeDialog(true);

                    if (path && registryData?.files) {
                      const file = registryData.files.find(
                        (file) => file.path === path,
                      );
                      setSelectedFile(file ?? null);
                    } else {
                      setSelectedFile(null);
                    }
                  });
                }
              }
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
        } catch (error) {
          console.error("Error clearing captured container innerHTML:", error);
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
  }, [code, theme, registryData]);

  const onZoomIn = React.useCallback(() => {
    panZoomRef.current?.zoomIn();
  }, []);

  const onZoomOut = React.useCallback(() => {
    panZoomRef.current?.zoomOut();
  }, []);

  const onResetView = React.useCallback(() => {
    panZoomRef.current?.reset();
  }, []);

  const onCopyCode = React.useCallback(async () => {
    if (isCopied) return;

    try {
      await navigator.clipboard.writeText(code);
      toast.success("Mermaid code copied to clipboard");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy code to clipboard");
    }
  }, [code, isCopied]);

  const onExportPNG = React.useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("Failed to export PNG: SVG element not found.");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to export PNG: Canvas context unavailable.");
      return;
    }

    const svgRect = svg.getBoundingClientRect();
    const { width: svgWidth, height: svgHeight } = svgRect;

    if (!svgWidth || !svgHeight) {
      toast.error("Failed to export PNG: Invalid SVG dimensions.");
      return;
    }

    const computedStyle = window.getComputedStyle(document.documentElement);
    const canvasColor = computedStyle.getPropertyValue("--canvas").trim();
    const borderColor = computedStyle.getPropertyValue("--border").trim();
    const canvasForegroundColor = computedStyle
      .getPropertyValue("--canvas-foreground")
      .trim();
    const fontSans = computedStyle.getPropertyValue("--font-sans").trim();

    let svgString = new XMLSerializer().serializeToString(svg);

    svgString = svgString.replace(
      /fill:\s*var\(--canvas\)/g,
      `fill:${canvasColor}`,
    );
    svgString = svgString.replace(
      /stroke:\s*var\(--border\)/g,
      `stroke:${borderColor}`,
    );
    svgString = svgString.replace(
      /color:\s*var\(--canvas-foreground\)/g,
      `color:${canvasForegroundColor}`,
    );
    svgString = svgString.replace(
      /font-family:\s*var\(--font-sans\)/g,
      `font-family:${fontSans}`,
    );
    svgString = svgString.replace(
      /fill:\s*var\(--canvas-foreground\)/g,
      `fill:${canvasForegroundColor}`,
    );

    svgString = svgString.replace(/transition:[^;]+;/g, "");
    svgString = svgString.replace(/:hover\s*{[^}]+}/g, "");

    const scale = 2;
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;

    const image = new Image();
    image.width = svgWidth;
    image.height = svgHeight;

    image.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0);

      const link = document.createElement("a");
      link.download = `${registryData?.name ?? "diagram"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Diagram exported as PNG");
    };

    image.onerror = () => {
      toast.error("Failed to export PNG: Error loading SVG data.");
    };

    image.src = `data:image/svg+xml;base64,${btoa(
      String.fromCharCode(...new TextEncoder().encode(svgString)),
    )}`;
  }, [registryData?.name]);

  return (
    <div className="relative size-full overflow-hidden">
      {isGenerating ? (
        <div
          role="status"
          className="absolute inset-0 z-20 flex items-center justify-center bg-background/50"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-current border-b-2" />
        </div>
      ) : error ? (
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
        <ActionButton
          tooltip="Copy Mermaid code"
          className="rounded-r-none"
          disabled={isGenerating || !!error || isCopied}
          onClick={onCopyCode}
        >
          {isCopied ? <Check /> : <Copy />}
        </ActionButton>
        <ActionButton
          tooltip="Export as PNG"
          className="rounded-none"
          disabled={isGenerating || !!error}
          onClick={onExportPNG}
        >
          <Download />
        </ActionButton>
        <ActionButton
          tooltip="Zoom out"
          className="rounded-none"
          disabled={isGenerating || !!error}
          onClick={onZoomOut}
        >
          <Minus />
        </ActionButton>
        <ActionButton
          tooltip="Reset view"
          onClick={onResetView}
          disabled={isGenerating || !!error}
          className="rounded-none"
        >
          <Maximize />
        </ActionButton>
        <ActionButton
          tooltip="Zoom in"
          onClick={onZoomIn}
          disabled={isGenerating || !!error}
          className="rounded-l-none"
        >
          <Plus />
        </ActionButton>
      </div>
      <div
        ref={containerRef}
        className={cn("size-full", isGenerating && "invisible", className)}
        {...props}
      />
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Node</DialogTitle>
            <DialogDescription
              className="flex flex-col gap-2 pt-2 text-muted-foreground text-sm"
              asChild
            >
              <div>
                {selectedFile ? (
                  <>
                    <span>
                      Path:{" "}
                      <code className="font-mono text-foreground">
                        {selectedFile.path}
                      </code>
                    </span>
                    <span>
                      Type:{" "}
                      <code className="font-mono text-foreground">
                        {selectedFile.type ?? "N/A"}
                      </code>
                    </span>
                  </>
                ) : selectedNodePath ? (
                  <span>
                    Path:{" "}
                    <code className="font-mono text-foreground">
                      {selectedNodePath}
                    </code>
                  </span>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedFile ? (
            <CodeBlock
              code={selectedFile.content ?? ""}
              language={selectedFile.path.split(".").pop()}
              className="max-h-[50svh] overflow-auto"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

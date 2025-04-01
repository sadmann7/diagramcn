"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Canvas, Edge, type EdgeProps, Node, type NodeProps } from "reaflow";
import { Space, type ViewPort } from "react-zoomable-ui";
import type { LongPressCallback, LongPressOptions } from "use-long-press";
import { useLongPress } from "use-long-press";
import { cn, debounce } from "@/lib/utils";
import { TextNode } from "@/components/text-node";
import { ObjectNode } from "@/components/object-node";
import { Edge as CustomEdge } from "@/components/edge";
import { useDiagram } from "@/hooks/use-diagram";
import { useTheme } from "next-themes";
import type { Node as DiagramNode } from "@/types";

const SUPPORTED_LIMIT = 1000; // Adjust based on your needs

interface DiagramProps {
  isWidget?: boolean;
  jsonData?: string;
}

const layoutOptions = {
  "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
};

export function Diagram({ isWidget = false, jsonData }: DiagramProps) {
  const {
    nodes,
    edges,
    loading,
    direction,
    viewPort,
    setViewPort,
    centerView,
    setLoading,
    setDiagram,
  } = useDiagram();
  const { resolvedTheme } = useTheme();
  const [paneWidth, setPaneWidth] = useState(2000);
  const [paneHeight, setPaneHeight] = useState(2000);

  useEffect(() => {
    if (!jsonData) return;

    try {
      setDiagram(jsonData, { loading: false });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      setLoading(false);
    }
  }, [jsonData, setDiagram, setLoading]);

  const onLayoutChange = useCallback(
    (layout: { width?: number; height?: number }) => {
      if (layout.width && layout.height) {
        const areaSize = layout.width * layout.height;
        const changeRatio = Math.abs(
          (areaSize * 100) / (paneWidth * paneHeight) - 100
        );

        setPaneWidth(layout.width + 50);
        setPaneHeight(layout.height + 50);

        setTimeout(() => {
          window.requestAnimationFrame(() => {
            if (changeRatio > 70 || isWidget) centerView();
            setLoading(false);
          });
        });
      }
    },
    [isWidget, paneHeight, paneWidth, centerView, setLoading]
  );

  const callback = useCallback<LongPressCallback>(() => {
    const canvas = document.querySelector(
      ".diagram-canvas"
    ) as HTMLDivElement | null;
    canvas?.classList.add("dragging");
  }, []);

  const bindLongPress = useLongPress(callback, {
    threshold: 150,
    onFinish: () => {
      const canvas = document.querySelector(
        ".diagram-canvas"
      ) as HTMLDivElement | null;
      canvas?.classList.remove("dragging");
    },
  } as LongPressOptions);

  const blurOnClick = useCallback(() => {
    if ("activeElement" in document)
      (document.activeElement as HTMLElement)?.blur();
  }, []);

  const debouncedOnZoomChangeHandler = useCallback(
    debounce(() => {
      if (viewPort) setViewPort(viewPort);
    }, 300),
    []
  );

  if (nodes.length > SUPPORTED_LIMIT) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-foreground">
          The diagram is too large to display. Please reduce the size of your
          data.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute h-full w-full",
        isWidget ? "h-screen" : "h-[calc(100vh-67px)]",
        "bg-background",
        // Grid pattern classes
        "bg-[length:100px_100px,100px_100px,20px_20px,20px_20px]",
        "bg-[-1.5px_-1.5px,-1.5px_-1.5px,-1px_-1px,-1px_-1px]",
        "[background-image:linear-gradient(var(--grid-primary)_1.5px,transparent_1.5px),linear-gradient(90deg,var(--grid-primary)_1.5px,transparent_1.5px),linear-gradient(var(--grid-secondary)_1px,transparent_1px),linear-gradient(90deg,var(--grid-secondary)_1px,transparent_1px)]",
        // Additional styles
        "[&_.diagram-space]:cursor-[url('/assets/cursor.svg'),auto]",
        "[&:active]:cursor-move",
        "[&_.dragging]:pointer-events-none",
        "[&_.dragging_button]:pointer-events-none"
      )}
      onContextMenu={(e) => e.preventDefault()}
      onClick={blurOnClick}
      {...bindLongPress()}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-foreground">Loading...</div>
        </div>
      )}
      <Space
        onUpdated={debouncedOnZoomChangeHandler}
        onCreate={setViewPort}
        onContextMenu={(e) => e.preventDefault()}
        treatTwoFingerTrackPadGesturesLikeTouch={true}
        pollForElementResizing
        className="diagram-space"
      >
        <Canvas
          className="diagram-canvas"
          onLayoutChange={onLayoutChange}
          node={(props: NodeProps) => {
            const node = props.properties as DiagramNode;
            const commonProps = {
              ...props,
              node,
              rx: 4,
              ry: 4,
              style: {
                fill:
                  node.data?.type === "property"
                    ? "#EBF5FF"
                    : node.data?.type === "array"
                    ? "#FFF5EB"
                    : node.data?.type === "object"
                    ? "#F0FFF4"
                    : "#FFFFFF",
                stroke:
                  node.data?.type === "property"
                    ? "#3B82F6"
                    : node.data?.type === "array"
                    ? "#F97316"
                    : node.data?.type === "object"
                    ? "#10B981"
                    : "#9CA3AF",
                strokeWidth: 1.5,
              },
            };
            return node.data?.type === "object" ? (
              <ObjectNode {...commonProps} />
            ) : (
              <TextNode {...commonProps} hasCollapse />
            );
          }}
          edge={(props: EdgeProps) => <CustomEdge {...props} />}
          nodes={nodes}
          edges={edges}
          maxHeight={paneHeight}
          maxWidth={paneWidth}
          height={paneHeight}
          width={paneWidth}
          direction={direction}
          layoutOptions={layoutOptions}
          key={[direction, resolvedTheme].join("-")}
          pannable={false}
          zoomable={false}
          animated={false}
          readonly={true}
          dragEdge={null}
          dragNode={null}
          fit={true}
          arrow={null}
        />
      </Space>
    </div>
  );
}

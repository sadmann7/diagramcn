"use client";

import { Edge } from "@/components/edge";
import { ObjectNode } from "@/components/object-node";
import { TextNode } from "@/components/text-node";
import { useDiagram } from "@/hooks/use-diagram";
import { cn, debounce } from "@/lib/utils";
import type { Node as DiagramNode } from "@/types";
import { useTheme } from "next-themes";
import * as React from "react";
import { Space } from "react-zoomable-ui";
import { Canvas, type EdgeProps, type NodeProps } from "reaflow";
import type { LongPressCallback, LongPressOptions } from "use-long-press";
import { useLongPress } from "use-long-press";

const SUPPORTED_LIMIT = 1000;

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
  const [paneWidth, setPaneWidth] = React.useState(2000);
  const [paneHeight, setPaneHeight] = React.useState(2000);

  React.useEffect(() => {
    if (!jsonData) return;

    try {
      setDiagram(jsonData, { loading: false });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      setLoading(false);
    }
  }, [jsonData, setDiagram, setLoading]);

  const onLayoutChange = React.useCallback(
    (layout: { width?: number; height?: number }) => {
      if (layout.width && layout.height) {
        const areaSize = layout.width * layout.height;
        const changeRatio = Math.abs(
          (areaSize * 100) / (paneWidth * paneHeight) - 100,
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
    [isWidget, paneHeight, paneWidth, centerView, setLoading],
  );

  const callback = React.useCallback<LongPressCallback>(() => {
    const canvas = document.querySelector(
      ".diagram-canvas",
    ) as HTMLDivElement | null;
    canvas?.classList.add("dragging");
  }, []);

  const bindLongPress = useLongPress(callback, {
    threshold: 150,
    onFinish: () => {
      const canvas = document.querySelector(
        ".diagram-canvas",
      ) as HTMLDivElement | null;
      canvas?.classList.remove("dragging");
    },
  } as LongPressOptions);

  const blurOnClick = React.useCallback(() => {
    if ("activeElement" in document)
      (document.activeElement as HTMLElement)?.blur();
  }, []);

  const debouncedOnZoomChangeHandler = React.useCallback(
    debounce(() => {
      if (viewPort) setViewPort(viewPort);
    }, 300),
    [],
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
      className="relative h-full w-full"
      onContextMenu={(event) => event.preventDefault()}
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
          nodes={nodes}
          edges={edges}
          edge={(props: EdgeProps) => <Edge {...props} />}
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

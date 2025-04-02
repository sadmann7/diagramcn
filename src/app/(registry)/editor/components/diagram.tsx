"use client";

import { Edge } from "@/components/edge";
import { Node } from "@/components/node";
import { useDiagram } from "@/hooks/use-diagram";
import { debounce } from "@/lib/utils";
import { useTheme } from "next-themes";
import * as React from "react";
import { Space } from "react-zoomable-ui";
import { Canvas, type ElkRoot } from "reaflow";
import type { LongPressCallback, LongPressOptions } from "use-long-press";
import { useLongPress } from "use-long-press";

const MAX_NODE_COUNT = 1000;

const layoutOptions = {
  "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
};

interface DiagramProps {
  isWidget?: boolean;
}

export function Diagram({ isWidget = false }: DiagramProps) {
  const {
    nodes,
    edges,
    direction,
    viewPort,
    setViewPort,
    centerView,
    isPending,
    setIsPending,
  } = useDiagram();
  const { resolvedTheme } = useTheme();
  const [width, setWidth] = React.useState(2000);
  const [height, setHeight] = React.useState(2000);

  const onLayoutChange = React.useCallback(
    (layout: ElkRoot) => {
      if (layout.width && layout.height) {
        const areaSize = layout.width * layout.height;
        const changeRatio = Math.abs((areaSize * 100) / (width * height) - 100);

        setWidth(layout.width + 50);
        setHeight(layout.height + 50);

        setTimeout(() => {
          window.requestAnimationFrame(() => {
            if (changeRatio > 70 || isWidget) centerView();
            setIsPending(false);
          });
        });
      }
    },
    [isWidget, height, width, centerView, setIsPending]
  );

  const callback = React.useCallback<LongPressCallback>(() => {
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

  const blurOnClick = React.useCallback(() => {
    if ("activeElement" in document)
      (document.activeElement as HTMLElement)?.blur();
  }, []);

  const debouncedSetViewPort = React.useCallback(
    debounce(() => {
      if (viewPort) setViewPort(viewPort);
    }, 300),
    []
  );

  if (nodes.length > MAX_NODE_COUNT) {
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
      className="relative size-full"
      onContextMenu={(event) => event.preventDefault()}
      onClick={blurOnClick}
      {...bindLongPress()}
    >
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-foreground">Loading...</div>
        </div>
      )}
      <Space
        onUpdated={debouncedSetViewPort}
        onCreate={setViewPort}
        onContextMenu={(e) => e.preventDefault()}
        treatTwoFingerTrackPadGesturesLikeTouch={true}
        pollForElementResizing
        className="diagram-space"
      >
        <Canvas
          key={[direction, resolvedTheme].join("-")}
          edges={edges}
          nodes={nodes}
          edge={(props) => <Edge {...props} />}
          node={(props) => <Node {...props} />}
          maxHeight={height}
          maxWidth={width}
          height={height}
          width={width}
          direction={direction}
          onLayoutChange={onLayoutChange}
          layoutOptions={layoutOptions}
          dragEdge={null}
          dragNode={null}
          arrow={null}
          pannable={false}
          zoomable={false}
          animated={false}
          readonly={true}
          fit
          className="diagram-canvas"
        />
      </Space>
    </div>
  );
}

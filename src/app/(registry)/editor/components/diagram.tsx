"use client";

import { DiagramToolbar } from "@/app/(registry)/editor/components/diagram-toolbar";
import { Edge } from "@/app/(registry)/editor/components/edge";
import { Node } from "@/app/(registry)/editor/components/node";
import { NodeDialog } from "@/app/(registry)/editor/components/node-dialog";
import { useDiagram } from "@/hooks/use-diagram";
import { type LongPressCallback, useLongPress } from "@/hooks/use-long-press";
import { MAX_NODE_COUNT } from "@/lib/constants";
import { debounce } from "@/lib/utils";
import { useTheme } from "next-themes";
import * as React from "react";
import { Space } from "react-zoomable-ui";
import { Canvas, type ElkRoot } from "reaflow";

const layoutOptions = {
  "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
};

interface DiagramProps {
  withToolbar?: boolean;
}

export function Diagram({ withToolbar }: DiagramProps) {
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
            if (changeRatio > 70 || withToolbar) centerView();
            setIsPending(false);
          });
        });
      }
    },
    [withToolbar, height, width, centerView, setIsPending],
  );

  const onLongPressStart = React.useCallback<LongPressCallback>(() => {
    const canvas = document.querySelector(
      ".diagram-canvas",
    ) as HTMLDivElement | null;
    canvas?.classList.add("dragging");
  }, []);

  const onLongPressEnd = useLongPress(onLongPressStart, {
    threshold: 150,
    onFinish: () => {
      const canvas = document.querySelector(
        ".diagram-canvas",
      ) as HTMLDivElement | null;
      canvas?.classList.remove("dragging");
    },
  });

  const onItemBlur = React.useCallback(() => {
    if ("activeElement" in document)
      (document.activeElement as HTMLElement)?.blur();
  }, []);

  const debouncedSetViewPort = React.useCallback(
    debounce(() => {
      if (viewPort) setViewPort(viewPort);
    }, 300),
    [],
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
      onClick={onItemBlur}
      {...onLongPressEnd}
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
        treatTwoFingerTrackPadGesturesLikeTouch
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
      <NodeDialog />
      {withToolbar && <DiagramToolbar />}
    </div>
  );
}

"use client";

import { useTheme } from "next-themes";
import * as React from "react";
import type { EdgeProps } from "reaflow";
import { Edge as ReaflowEdge } from "reaflow";

function EdgeImpl(props: EdgeProps) {
  const { resolvedTheme } = useTheme();

  return (
    <ReaflowEdge
      containerClassName={`edge-${props.id}`}
      style={{
        stroke: resolvedTheme === "dark" ? "#444444" : "#BCBEC0",
        strokeWidth: 1.5,
      }}
      {...props}
    />
  );
}

export const Edge = React.memo(EdgeImpl);

"use client";

import * as React from "react";
import type { EdgeProps } from "reaflow";
import { Edge as ReaflowEdge } from "reaflow";

function EdgeImpl({ id, ...props }: EdgeProps) {
  return (
    <ReaflowEdge
      id={id}
      containerClassName={`edge-${id}`}
      style={{
        stroke: "var(--border)",
        strokeWidth: 1.5,
      }}
      {...props}
    />
  );
}

export const Edge = React.memo(EdgeImpl);

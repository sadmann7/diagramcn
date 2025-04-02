import { useDiagram } from "@/hooks/use-diagram";
import { INVISIBLE_CLASS_NAME } from "@/lib/constants";
import * as React from "react";

export function useBranch() {
  const { collapsedNodes, collapsedEdges } = useDiagram();

  const onBranchToggle = React.useCallback(() => {
    const nodeList = collapsedNodes.map((id) => `[id$="node-${id}"]`);
    const edgeList = collapsedEdges.map((id) => `[class$="edge-${id}"]`);
    const hiddenItems = document.body.querySelectorAll(
      `.${INVISIBLE_CLASS_NAME}`,
    );

    for (const item of hiddenItems) {
      item.classList.remove(INVISIBLE_CLASS_NAME);
    }

    if (nodeList.length || edgeList.length) {
      const selector = [...nodeList, ...edgeList].join(",");
      if (selector) {
        const elementsToHide = document.body.querySelectorAll(selector);
        for (const element of elementsToHide) {
          element.classList.add(INVISIBLE_CLASS_NAME);
        }
      }
    }
  }, [collapsedNodes, collapsedEdges]);

  React.useEffect(() => {
    onBranchToggle();
  }, [onBranchToggle]);

  return {
    onBranchToggle,
  };
}

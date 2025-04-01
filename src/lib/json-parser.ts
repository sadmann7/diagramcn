import { addEdgeToDiagram, addNodeToDiagram, getNodePath } from "@/lib/diagram";
import { traverse } from "@/lib/traverse";
import type { Diagram, JsonParserStates } from "@/types";
import { parseTree } from "jsonc-parser";

function initializeStates(): JsonParserStates {
  return {
    parentName: "",
    bracketOpen: [],
    objectsFromArray: [],
    objectsFromArrayId: 0,
    notHaveParent: [],
    brothersNode: [],
    brothersParentId: undefined,
    brotherKey: "",
    brothersNodeProps: [],
    diagram: {
      nodes: [],
      edges: [],
    },
  };
}

export function parser(jsonStr: string): Diagram {
  try {
    const states = initializeStates();
    const parsedJsonTree = parseTree(jsonStr);

    if (!parsedJsonTree) {
      throw new Error("Invalid document");
    }

    traverse({ states, objectToTraverse: parsedJsonTree });

    const { notHaveParent, diagram } = states;

    if (notHaveParent.length > 1 && parsedJsonTree.type !== "array") {
      const emptyNode = { id: null, text: "", isEmpty: true, data: {} };
      const emptyId = addNodeToDiagram({ diagram, ...emptyNode });

      for (const childId of notHaveParent) {
        addEdgeToDiagram({ diagram, from: emptyId, to: childId });
      }
    }

    if (diagram.nodes.length === 0) {
      addNodeToDiagram({
        diagram,
        text: parsedJsonTree.type === "array" ? "[]" : "{}",
      });
    }

    // filter parent nodes that have no children
    // not the best way to do this, but it works
    const filteredNodes = diagram.nodes.filter((node) => {
      if (node.data.isParent && node.data.childrenCount === 0) {
        return false;
      }

      return true;
    });

    // add path to nodes
    diagram.nodes = filteredNodes.map((node) => ({
      ...node,
      path: getNodePath({
        nodes: diagram.nodes,
        edges: diagram.edges,
        nodeId: node.id,
      }),
    }));

    // filter edges that have no from or to node (since we filtered empty parent nodes)
    diagram.edges = diagram.edges.filter((edge) => {
      const fromNode = diagram.nodes.find((node) => node.id === edge.from);
      const toNode = diagram.nodes.find((node) => node.id === edge.to);

      if (!fromNode || !toNode) return false;
      return true;
    });

    return diagram;
  } catch (error) {
    console.error(error);
    return { nodes: [], edges: [] };
  }
}

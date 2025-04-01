import type { Diagram, Edge, Node } from "@/types";
import type { NodeType } from "jsonc-parser";
import { getParentsForNodeId } from "reaflow";
import { NODE_DIMENSIONS } from "@/lib/constants";

interface AddEdgeToDiagramProps {
  diagram: Diagram;
  from: string;
  to: string;
}

export function addEdgeToDiagram({ diagram, from, to }: AddEdgeToDiagramProps) {
  diagram.edges.push({
    id: `e${from}-${to}`,
    from: from,
    to: to,
  });
}

interface AddNodeToDiagramProps {
  diagram: Diagram;
  text: string | [string, string][];
  type?: NodeType;
  isEmpty?: boolean;
}

export function addNodeToDiagram({
  diagram,
  text,
  type = "null",
  isEmpty = false,
}: AddNodeToDiagramProps) {
  const id = String(diagram.nodes.length + 1);
  const isParent = type === "array" || type === "object";
  const { width, height } = calculateNodeSize({ text, isParent });

  const node = {
    id,
    text,
    width,
    height,
    data: {
      type,
      isParent,
      isEmpty,
      childrenCount: isParent ? 1 : 0,
    },
  };

  diagram.nodes.push(node);

  return id;
}

type Text = string | [string, string][];
type Size = { width: number; height: number };

export function isContentImage(value: Text) {
  if (typeof value !== "string") return false;

  const isImageURL = /(https?:\/\/.*\.(?:png|jpg|gif|svg))/i.test(value);
  const isBase64 = value.startsWith("data:image/") && value.includes("base64");

  return isImageURL || isBase64;
}

export function calculateLines(text: Text): string {
  if (typeof text === "string") {
    return text;
  }

  return text
    .map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 80)}`)
    .join("\n");
}

export function calculateWidthAndHeight(str: string, single = false) {
  if (!str) return { width: 45, height: 45 };

  const dummyElement = document.createElement("div");
  dummyElement.style.whiteSpace = single ? "nowrap" : "pre-wrap";
  dummyElement.innerHTML = str;
  dummyElement.style.fontSize = "12px";
  dummyElement.style.width = "fit-content";
  dummyElement.style.padding = "0 10px";
  dummyElement.style.fontWeight = "500";
  dummyElement.style.fontFamily = "monospace";
  document.body.appendChild(dummyElement);

  const clientRect = dummyElement.getBoundingClientRect();
  const lines = str.split("\n").length;

  const width = clientRect.width + 4;
  // Use parent height for single line nodes that are parents
  const height = single
    ? NODE_DIMENSIONS.PARENT_HEIGHT
    : lines * NODE_DIMENSIONS.ROW_HEIGHT;

  document.body.removeChild(dummyElement);
  return { width, height };
}

const sizeCache = new Map<Text, Size>();

// clear cache every 2 mins
setInterval(() => sizeCache.clear(), 120_000);

export function calculateNodeSize({
  text,
  isParent = false,
}: {
  text: Text;
  isParent: boolean;
}) {
  const isImage = isContentImage(text);

  const cacheKey = [text, isParent].toString();

  // check cache if data already exists
  if (sizeCache.has(cacheKey)) {
    const size = sizeCache.get(cacheKey);
    if (size) return size;
  }

  const lines = calculateLines(text);
  const sizes = calculateWidthAndHeight(lines, typeof text === "string");

  if (isImage) {
    sizes.width = 80;
    sizes.height = 80;
  }

  if (isParent) sizes.width += 80;
  if (sizes.width > 700) sizes.width = 700;

  sizeCache.set(cacheKey, sizes);
  return sizes;
}

interface GetChildrenEdgesProps {
  nodes: Node[];
  edges: Edge[];
}

export function getChildrenEdges({ nodes, edges }: GetChildrenEdgesProps) {
  const nodeIds = nodes.map((node) => node.id);

  return edges.filter(
    (edge) => nodeIds.includes(edge.from) || nodeIds.includes(edge.to)
  );
}

interface GetNodePathProps {
  nodes: Node[];
  edges: Edge[];
  nodeId: string;
}

export function getNodePath({ nodes, edges, nodeId }: GetNodePathProps) {
  let resolvedPath = "";
  const parentIds = getParentsForNodeId(nodes, edges, nodeId).map((n) => n.id);
  const path = parentIds.reverse().concat(nodeId);
  const rootArrayElementIds = ["1"];
  const edgesMap = new Map();

  for (const edge of edges) {
    if (!edgesMap.has(edge.from)) {
      edgesMap.set(edge.from, []);
    }
    edgesMap.get(edge.from).push(edge.to);
  }

  for (let i = 1; i < edges.length; i++) {
    const curNodeId = edges[i]?.from;

    if (!curNodeId) continue;

    if (rootArrayElementIds.includes(curNodeId)) continue;
    if (!edgesMap.has(curNodeId)) {
      rootArrayElementIds.push(curNodeId);
    }
  }

  if (rootArrayElementIds.length > 1) {
    resolvedPath += `Root[${rootArrayElementIds.findIndex(
      (id) => id === path[0]
    )}]`;
  } else {
    resolvedPath += "{Root}";
  }

  for (let i = 1; i < path.length; i++) {
    const curId = path[i];
    const curNode = nodes[+curId - 1];

    if (!curNode) break;
    if (curNode.data?.type === "array") {
      resolvedPath += `.${curNode.text}`;

      if (i !== path.length - 1) {
        const toNodeId = path[i + 1];
        const idx = edgesMap.get(curId).indexOf(toNodeId);

        resolvedPath += `[${idx}]`;
      }
    }

    if (curNode.data?.type === "object") {
      resolvedPath += `.${curNode.text}`;
    }
  }

  return resolvedPath;
}

interface GetOutgoersProps {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  parent?: string[];
}

export function getOutgoers({
  nodeId,
  nodes,
  edges,
  parent = [],
}: GetOutgoersProps): [Node[], string[]] {
  const outgoerNodes: Node[] = [];
  const matchingNodes: string[] = [];

  if (parent.includes(nodeId)) {
    const initialParentNode = nodes.find((n) => n.id === nodeId);

    if (initialParentNode) outgoerNodes.push(initialParentNode);
  }

  const findOutgoers = (currentNodeId: string) => {
    const outgoerIds = edges
      .filter((e) => e.from === currentNodeId)
      .map((e) => e.to);
    const nodeList = nodes.filter((n) => {
      if (parent.includes(n.id) && !matchingNodes.includes(n.id))
        matchingNodes.push(n.id);
      return outgoerIds.includes(n.id) && !parent.includes(n.id);
    });

    outgoerNodes.push(...nodeList);
    for (const node of nodeList) {
      findOutgoers(node.id);
    }
  };

  findOutgoers(nodeId);
  return [outgoerNodes, matchingNodes];
}

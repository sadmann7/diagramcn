import type { NodeType } from "jsonc-parser";

export interface Node {
  id: string;
  text: string | [string, string][];
  width: number;
  height: number;
  path?: string;
  data: {
    type: NodeType;
    isParent: boolean;
    isEmpty: boolean;
    childrenCount: number;
  };
}

export interface Edge {
  id: string;
  from: string;
  to: string;
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
}

export interface JsonParserStates {
  parentName: string;
  bracketOpen: { id: string; type: string }[];
  objectsFromArray: number[];
  objectsFromArrayId: number;
  notHaveParent: string[];
  brothersNode: [string, string][] | string;
  brothersParentId: string | undefined;
  brotherKey: string;
  brothersNodeProps: {
    id: string;
    parentId: string | undefined;
    objectsFromArrayId: number | undefined;
  }[];
  diagram: Diagram;
}

export type PrimitiveOrNull = "boolean" | "string" | "number" | "null";

import { useJson } from "@/hooks/use-json";
import { getChildrenEdges, getOutgoers } from "@/lib/diagram";
import { parser } from "@/lib/json-parser";
import type { Edge, Node } from "@/types";
import * as React from "react";
import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow";

export interface Diagram {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  diagramCollapsed: boolean;
  fullscreen: boolean;
  collapseAll: boolean;
  nodes: Node[];
  edges: Edge[];
  collapsedNodes: string[];
  collapsedEdges: string[];
  collapsedParents: string[];
  selectedNode: Node | null;
  path: string;
}

const initialState: Diagram = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  diagramCollapsed: false,
  fullscreen: false,
  collapseAll: false,
  nodes: [],
  edges: [],
  collapsedNodes: [],
  collapsedEdges: [],
  collapsedParents: [],
  selectedNode: null,
  path: "",
};

// Create store
const createStore = (initialState: Diagram) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const setState = (
    partial: Partial<Diagram> | ((state: Diagram) => Partial<Diagram>),
  ) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...nextState };
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getState: () => state,
    setState,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
  };
};

const store = createStore(initialState);

// Actions
export const actions = {
  toggleCollapseAll: (collapseAll: boolean) => {
    store.setState({ collapseAll });
    actions.collapseDiagram();
  },

  clearDiagram: () => store.setState({ nodes: [], edges: [], loading: false }),

  getCollapsedNodeIds: () => store.getState().collapsedNodes,

  getCollapsedEdgeIds: () => store.getState().collapsedEdges,

  setSelectedNode: (Node: Node) => store.setState({ selectedNode: Node }),

  setDiagram: (data?: string, options?: Partial<Diagram>) => {
    const { nodes, edges } = parser(data ?? useJson().json);
    const state = store.getState();

    if (state.collapseAll) {
      store.setState({ nodes, edges, ...options });
      actions.collapseDiagram();
    } else {
      store.setState({
        nodes,
        edges,
        collapsedParents: [],
        collapsedNodes: [],
        collapsedEdges: [],
        diagramCollapsed: false,
        ...options,
      });
    }
  },

  setDirection: (direction: CanvasDirection = "RIGHT") => {
    store.setState({ direction });
    setTimeout(() => actions.centerView(), 200);
  },

  setLoading: (loading: boolean) => store.setState({ loading }),

  expandNodes: (nodeId: string) => {
    const state = store.getState();
    const [childrenNodes, matchingNodes] = getOutgoers({
      nodeId,
      nodes: state.nodes,
      edges: state.edges,
      parent: state.collapsedParents,
    });
    const childrenEdges = getChildrenEdges({
      nodes: childrenNodes,
      edges: state.edges,
    });

    const nodesConnectedToParent = childrenEdges.reduce(
      (nodes: string[], edge: Edge) => {
        if (edge.from && !nodes.includes(edge.from)) nodes.push(edge.from);
        if (edge.to && !nodes.includes(edge.to)) nodes.push(edge.to);
        return nodes;
      },
      [],
    );

    const matchingNodesConnectedToParent = matchingNodes.filter(
      (node: string) => nodesConnectedToParent.includes(node),
    );
    const nodeIds = childrenNodes
      .map((node: Node) => node.id)
      .concat(matchingNodesConnectedToParent);
    const edgeIds = childrenEdges.map((edge: Edge) => edge.id);

    const collapsedParents = state.collapsedParents.filter(
      (cp) => cp !== nodeId,
    );
    const collapsedNodes = state.collapsedNodes.filter(
      (nodeId) => !nodeIds.includes(nodeId),
    );
    const collapsedEdges = state.collapsedEdges.filter(
      (edgeId) => !edgeIds.includes(edgeId),
    );

    store.setState({
      collapsedParents,
      collapsedNodes,
      collapsedEdges,
      diagramCollapsed: !!collapsedNodes.length,
    });
  },

  collapseNodes: (nodeId: string) => {
    const state = store.getState();
    const [childrenNodes] = getOutgoers({
      nodeId,
      nodes: state.nodes,
      edges: state.edges,
    });
    const childrenEdges = getChildrenEdges({
      nodes: childrenNodes,
      edges: state.edges,
    });

    const nodeIds = childrenNodes.map((node: Node) => node.id);
    const edgeIds = childrenEdges.map((edge: Edge) => edge.id);

    store.setState({
      collapsedParents: state.collapsedParents.concat(nodeId),
      collapsedNodes: state.collapsedNodes.concat(nodeIds),
      collapsedEdges: state.collapsedEdges.concat(edgeIds),
      diagramCollapsed: !!state.collapsedNodes.concat(nodeIds).length,
    });
  },

  collapseDiagram: () => {
    const state = store.getState();
    const edges = state.edges;
    const tos = edges.map((edge: Edge) => edge.to);
    const froms = edges.map((edge: Edge) => edge.from);
    const parentNodesIds = froms.filter((id) => !tos.includes(id));
    const secondDegreeNodesIds = edges
      .filter((edge: Edge) => parentNodesIds.includes(edge.from))
      .map((edge: Edge) => edge.to);

    const collapsedParents = state.nodes
      .filter(
        (node: Node) =>
          !parentNodesIds.includes(node.id) && node.data?.isParent,
      )
      .map((node: Node) => node.id);

    const collapsedNodes = state.nodes
      .filter(
        (node: Node) =>
          !parentNodesIds.includes(node.id) &&
          !secondDegreeNodesIds.includes(node.id),
      )
      .map((node: Node) => node.id);

    const closestParentToRoot = Math.min(...collapsedParents.map((n) => +n));
    const focusNodeId = `g[id*='node-${closestParentToRoot}']`;
    const rootNode = document.querySelector(focusNodeId);

    store.setState({
      collapsedParents,
      collapsedNodes,
      collapsedEdges: state.edges
        .filter((edge) => !parentNodesIds.includes(edge.from))
        .map((edge) => edge.id),
      diagramCollapsed: true,
    });

    if (rootNode && state.viewPort) {
      state.viewPort.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
        elementExtraMarginForZoom: 300,
      });
    }
  },

  expandGraph: () => {
    store.setState({
      collapsedNodes: [],
      collapsedEdges: [],
      collapsedParents: [],
      diagramCollapsed: false,
    });
  },

  focusFirstNode: () => {
    const state = store.getState();
    const rootNode = document.querySelector("g[id*='node-1']");
    state.viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },

  setZoomFactor: (zoomFactor: number) => {
    const state = store.getState();
    const viewPort = state.viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },

  zoomIn: () => {
    const state = store.getState();
    const viewPort = state.viewPort;
    viewPort?.camera?.recenter(
      viewPort.centerX,
      viewPort.centerY,
      viewPort.zoomFactor + 0.1,
    );
  },

  zoomOut: () => {
    const state = store.getState();
    const viewPort = state.viewPort;
    viewPort?.camera?.recenter(
      viewPort.centerX,
      viewPort.centerY,
      viewPort.zoomFactor - 0.1,
    );
  },

  centerView: () => {
    const state = store.getState();
    const viewPort = state.viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(
      ".jsoncrack-canvas",
    ) as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },

  toggleFullscreen: (fullscreen: boolean) => store.setState({ fullscreen }),

  setViewPort: (viewPort: ViewPort) => store.setState({ viewPort }),
};

export function useDiagram() {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...state, ...actions };
}

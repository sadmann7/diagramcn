import * as React from "react";
import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow";
import { getChildrenEdges, getOutgoers } from "@/lib/diagram";
import { jsonParser } from "@/lib/json-parser";
import type { Edge, Node } from "@/types";

interface DiagramState {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  isPending: boolean;
  diagramCollapsed: boolean;
  fullscreen: boolean;
  collapseAll: boolean;
  nodes: Node[];
  edges: Edge[];
  collapsedNodes: string[];
  collapsedEdges: string[];
  collapsedParents: string[];
  path: string;
}

const initialState: DiagramState = {
  viewPort: null,
  direction: "RIGHT",
  isPending: true,
  diagramCollapsed: false,
  fullscreen: false,
  collapseAll: false,
  nodes: [],
  edges: [],
  collapsedNodes: [],
  collapsedEdges: [],
  collapsedParents: [],
  path: "",
};

const createStore = (initialState: DiagramState) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const setState = (
    partial:
      | Partial<DiagramState>
      | ((state: DiagramState) => Partial<DiagramState>),
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

export const diagramActions = {
  toggleCollapseAll: (collapseAll: boolean) => {
    store.setState({ collapseAll });
    diagramActions.collapseDiagram();
  },

  clearDiagram: () =>
    store.setState({ nodes: [], edges: [], isPending: false }),

  getCollapsedNodeIds: () => store.getState().collapsedNodes,

  getCollapsedEdgeIds: () => store.getState().collapsedEdges,

  setDiagram: (data: string, options?: Partial<DiagramState>) => {
    const { nodes, edges } = jsonParser(data);
    const state = store.getState();

    if (state.collapseAll) {
      store.setState({ nodes, edges, ...options });
      diagramActions.collapseDiagram();
      return;
    }

    store.setState({
      nodes,
      edges,
      collapsedParents: [],
      collapsedNodes: [],
      collapsedEdges: [],
      diagramCollapsed: false,
      ...options,
    });
  },

  setDirection: (direction: CanvasDirection = "RIGHT") => {
    store.setState({ direction });
    setTimeout(() => diagramActions.centerView(), 200);
  },

  setIsPending: (isPending: boolean) => store.setState({ isPending }),

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

  expandDiagram: () => {
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
      ".diagram-canvas",
    ) as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },

  toggleFullscreen: (fullscreen: boolean) => store.setState({ fullscreen }),

  setViewPort: (viewPort: ViewPort) => store.setState({ viewPort }),
};

export function useDiagram() {
  const getSnapshot = React.useCallback(() => store.getState(), []);

  const state = React.useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  );

  return { ...state, ...diagramActions };
}

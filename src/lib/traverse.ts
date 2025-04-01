import {
  addEdgeToDiagram,
  addNodeToDiagram,
  calculateNodeSize,
} from "@/lib/diagram";
import type { Diagram, JsonParserStates, PrimitiveOrNull } from "@/types";
import type { Node, NodeType } from "jsonc-parser";

function isPrimitiveOrNull(type: unknown): type is PrimitiveOrNull {
  if (!(typeof type === "string")) return false;

  return ["boolean", "string", "number", "null"].includes(type);
}

function alignChildren(nodeA: Node, nodeB: Node): number {
  const aChildType = nodeA?.children?.[1]?.type;
  const bChildType = nodeB?.children?.[1]?.type;

  if (isPrimitiveOrNull(aChildType) && !isPrimitiveOrNull(bChildType)) {
    return -1;
  }

  return 0;
}

function traverseWithoutChildren(
  value: string | undefined,
  states: JsonParserStates,
  diagram: Diagram,
  myParentId?: string,
  parentType?: string,
  nextType?: string,
) {
  if (value === undefined) return;

  if (
    parentType === "property" &&
    nextType !== "object" &&
    nextType !== "array"
  ) {
    states.brothersParentId = myParentId;
    if (nextType === undefined && Array.isArray(states.brothersNode)) {
      states.brothersNode.push([states.brotherKey, value]);
    } else {
      states.brotherKey = value;
    }
  } else if (parentType === "array") {
    const nodeFromArrayId = addNodeToDiagram({ diagram, text: String(value) });

    if (myParentId) {
      addEdgeToDiagram({ diagram, from: myParentId, to: nodeFromArrayId });
    }
  }

  if (
    nextType &&
    parentType !== "array" &&
    (nextType === "object" || nextType === "array")
  ) {
    states.parentName = value;
  }
}

function traverseWithChildren(
  type: NodeType,
  states: JsonParserStates,
  diagram: Diagram,
  children: Node[],
  myParentId?: string,
  parentType?: string,
) {
  let parentId: string | undefined;

  if (type !== "property" && states.parentName !== "") {
    // add last brothers node and add parent node

    if (states.brothersNode.length > 0) {
      const findBrothersNode = states.brothersNodeProps.find(
        (e) =>
          e.parentId === states.brothersParentId &&
          e.objectsFromArrayId ===
            states.objectsFromArray[states.objectsFromArray.length - 1],
      );

      if (findBrothersNode) {
        const findNodeIndex = diagram.nodes.findIndex(
          (e) => e.id === findBrothersNode?.id,
        );

        if (findNodeIndex !== -1) {
          const modifyNodes = [...diagram.nodes];
          const foundNode = modifyNodes[findNodeIndex];

          if (foundNode) {
            if (
              Array.isArray(foundNode.text) &&
              Array.isArray(states.brothersNode)
            ) {
              foundNode.text = [...foundNode.text, ...states.brothersNode];
            } else if (
              typeof foundNode.text === "string" &&
              typeof states.brothersNode === "string"
            ) {
              foundNode.text = foundNode.text + states.brothersNode;
            } else if (Array.isArray(states.brothersNode)) {
              foundNode.text = states.brothersNode;
            } else {
              foundNode.text = states.brothersNode.toString();
            }
            const { width, height } = calculateNodeSize({
              text: foundNode.text,
              isParent: false,
            });

            foundNode.width = width;
            foundNode.height = height;

            diagram.nodes = modifyNodes;
            states.brothersNode = [];
          }
        }
      } else {
        const brothersNodeId = addNodeToDiagram({
          diagram,
          text: states.brothersNode,
        });

        states.brothersNode = [];

        if (states.brothersParentId) {
          addEdgeToDiagram({
            diagram,
            from: states.brothersParentId,
            to: brothersNodeId,
          });
        } else {
          states.notHaveParent.push(brothersNodeId);
        }

        states.brothersNodeProps.push({
          id: brothersNodeId,
          parentId: states.brothersParentId,
          objectsFromArrayId:
            states.objectsFromArray[states.objectsFromArray.length - 1],
        });
      }
    }

    // Add parent node
    parentId = addNodeToDiagram({ diagram, type, text: states.parentName });
    states.bracketOpen.push({ id: parentId, type });
    states.parentName = "";

    // Add edges from parent node
    const brothersProps = states.brothersNodeProps.filter(
      (e) =>
        e.parentId === myParentId &&
        e.objectsFromArrayId ===
          states.objectsFromArray[states.objectsFromArray.length - 1],
    );

    if (
      (brothersProps.length > 0 &&
        states.bracketOpen[states.bracketOpen.length - 2]?.type !== "object") ||
      (brothersProps.length > 0 && states.bracketOpen.length === 1)
    ) {
      addEdgeToDiagram({
        diagram,
        from: brothersProps[brothersProps.length - 1]?.id ?? "",
        to: parentId,
      });
    } else if (myParentId) {
      addEdgeToDiagram({ diagram, from: myParentId, to: parentId });
    } else {
      states.notHaveParent.push(parentId);
    }
  } else if (parentType === "array") {
    states.objectsFromArray = [
      ...states.objectsFromArray,
      states.objectsFromArrayId++,
    ];
  }

  function traverseObject(objectToTraverse: Node, nextType: string) {
    traverse({
      states,
      objectToTraverse,
      parentType: type,
      myParentId: states.bracketOpen[states.bracketOpen.length - 1]?.id,
      nextType,
    });
  }

  function traverseArray() {
    children.forEach((objectToTraverse, index, array) => {
      const nextType = array[index + 1]?.type;

      traverseObject(objectToTraverse, nextType ?? "");
    });
  }

  if (type === "object") {
    children.sort(alignChildren);
    traverseArray();
  } else {
    traverseArray();
  }

  if (type !== "property") {
    // Add or concatenate brothers node when it is the last parent node
    if (states.brothersNode.length > 0) {
      const findBrothersNode = states.brothersNodeProps.find(
        (e) =>
          e.parentId === states.brothersParentId &&
          e.objectsFromArrayId ===
            states.objectsFromArray[states.objectsFromArray.length - 1],
      );

      if (findBrothersNode) {
        const modifyNodes = [...diagram.nodes];
        const findNodeIndex = modifyNodes.findIndex(
          (e) => e.id === findBrothersNode?.id,
        );

        if (
          modifyNodes[findNodeIndex] &&
          typeof states.brothersNode === "string"
        ) {
          modifyNodes[findNodeIndex].text += states.brothersNode;

          const { width, height } = calculateNodeSize({
            text: modifyNodes[findNodeIndex].text,
            isParent: false,
          });

          modifyNodes[findNodeIndex].width = width;
          modifyNodes[findNodeIndex].height = height;

          diagram.nodes = modifyNodes;
          states.brothersNode = [];
        }
      } else {
        const brothersNodeId = addNodeToDiagram({
          diagram,
          text: states.brothersNode,
        });

        states.brothersNode = [];

        if (states.brothersParentId) {
          addEdgeToDiagram({
            diagram,
            from: states.brothersParentId,
            to: brothersNodeId,
          });
        } else {
          states.notHaveParent = [...states.notHaveParent, brothersNodeId];
        }

        const brothersNodeProps = {
          id: brothersNodeId,
          parentId: states.brothersParentId,
          objectsFromArrayId:
            states.objectsFromArray[states.objectsFromArray.length - 1],
        };

        states.brothersNodeProps = [
          ...states.brothersNodeProps,
          brothersNodeProps,
        ];
      }
    }

    // Close brackets
    if (parentType === "array") {
      if (states.objectsFromArray.length > 0) {
        states.objectsFromArray.pop();
      }
    } else {
      if (states.bracketOpen.length > 0) {
        states.bracketOpen.pop();
      }
    }

    if (parentId) {
      const myChildren = diagram.edges.filter((edge) => edge.from === parentId);
      const parentIndex = diagram.nodes.findIndex(
        (node) => node.id === parentId,
      );

      diagram.nodes = diagram.nodes.map((node, index) => {
        if (index === parentIndex) {
          const childrenCount = myChildren.length;

          return { ...node, data: { ...node.data, childrenCount } };
        }
        return node;
      });
    }
  }
}

interface TraverseProps {
  states: JsonParserStates;
  objectToTraverse: Node;
  parentType?: string;
  myParentId?: string;
  nextType?: string;
}

export function traverse({
  objectToTraverse,
  states,
  myParentId,
  nextType,
  parentType,
}: TraverseProps) {
  const diagram = states.diagram;
  const { type, children, value } = objectToTraverse;

  if (!children) {
    traverseWithoutChildren(
      value,
      states,
      diagram,
      myParentId,
      parentType,
      nextType,
    );
    return;
  }

  traverseWithChildren(type, states, diagram, children, myParentId, parentType);
}

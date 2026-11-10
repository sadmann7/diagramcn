import type { InspectResult } from "@/lib/registry/inspect";

import { getPlannedFileId } from "@/lib/registry/plan";

function escapeLabel(label: string) {
  return label.replace(/"/g, "#quot;").replace(/[<>]/g, "");
}

function createIdFactory(prefix: string) {
  const ids = new Map<string, string>();
  return (key: string) => {
    let id = ids.get(key);
    if (!id) {
      id = `${prefix}${ids.size}`;
      ids.set(key, id);
    }
    return id;
  };
}

/** Items and the npm packages they pull in. */
export function getItemsMermaid({ graph, plan }: InspectResult) {
  const itemId = createIdFactory("item");
  const packageId = createIdFactory("pkg");
  const lines = ["flowchart LR"];

  for (const node of graph.nodes) {
    const name = node.item
      ? node.namespace
        ? `${node.namespace}/${node.item.name}`
        : node.item.name
      : node.specifier;
    const meta = node.item
      ? `${node.item.type.replace("registry:", "")} · ${node.item.files?.length ?? 0} ${node.item.files?.length === 1 ? "file" : "files"}`
      : "unresolved";
    const className = node.error
      ? "error"
      : graph.roots.includes(node.id)
        ? "root"
        : "item";
    lines.push(
      `  ${itemId(node.id)}["${escapeLabel(name)}<br/><small>${escapeLabel(meta)}</small>"]:::${className}`,
    );
  }

  for (const edge of graph.edges) {
    lines.push(`  ${itemId(edge.from)} --> ${itemId(edge.to)}`);
  }

  for (const dependency of plan.dependencies) {
    lines.push(
      `  ${packageId(dependency.name)}(["${escapeLabel(dependency.name)}"]):::npm`,
    );
    const owners = new Set(
      dependency.versions.flatMap((version) => version.requiredBy),
    );
    for (const node of graph.nodes) {
      const label = node.item
        ? node.namespace
          ? `${node.namespace}/${node.item.name}`
          : node.item.name
        : null;
      if (label && owners.has(label)) {
        lines.push(`  ${itemId(node.id)} -.-> ${packageId(dependency.name)}`);
      }
    }
  }

  lines.push(...classDefs);
  return lines.join("\n");
}

/** Files grouped by item, linked by their imports. */
export function getFilesMermaid({ plan }: InspectResult) {
  const fileId = createIdFactory("file");
  const groupId = createIdFactory("group");
  const lines = ["flowchart LR"];

  const byItem = new Map<string, typeof plan.files>();
  for (const file of plan.files) {
    byItem.set(file.itemName, [...(byItem.get(file.itemName) ?? []), file]);
  }

  for (const [itemName, files] of byItem) {
    lines.push(`  subgraph ${groupId(itemName)}["${escapeLabel(itemName)}"]`);
    for (const file of files) {
      const id = fileId(getPlannedFileId(file));
      const label = file.target ?? file.path;
      lines.push(
        `    ${id}["${escapeLabel(label.split("/").pop() ?? label)}"]:::${file.type.replace("registry:", "")}`,
      );
      lines.push(
        `    click ${id} href "#" "${escapeLabel(getPlannedFileId(file))}"`,
      );
    }
    lines.push("  end");
  }

  for (const file of plan.files) {
    for (const importId of file.imports) {
      lines.push(`  ${fileId(getPlannedFileId(file))} --> ${fileId(importId)}`);
    }
  }

  lines.push(...classDefs);
  return lines.join("\n");
}

const classDefs = [
  "  classDef root stroke-width:3px",
  "  classDef error stroke:#ef4444,stroke-dasharray:4 3",
  "  classDef npm stroke-dasharray:2 2",
];

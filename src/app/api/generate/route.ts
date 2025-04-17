import {
  type RegistryItem,
  registryItemSchema,
} from "@/lib/validations/registry";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url({
    message: "Please provide a valid URL",
  }),
});

export async function POST(req: Request) {
  try {
    const { url } = requestSchema.parse(await req.json());

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch registry data: HTTP ${response.status}`);
    }

    const registryResponse = await response.json();
    const registry = registryItemSchema.parse(registryResponse);

    const registries: RegistryItem[] = [registry];

    const externalDependencies = (registry.registryDependencies ?? []).filter(
      (dep) => dep.startsWith("http") && dep.endsWith(".json"),
    );

    if (externalDependencies.length > 0) {
      const externalResults = await Promise.all(
        externalDependencies.map(async (registryDependency) => {
          const externalResponse = await fetch(registryDependency);
          if (!externalResponse.ok) {
            throw new Error(
              `Failed to fetch external dependency: HTTP ${externalResponse.status}`,
            );
          }
          const externalData = await externalResponse.json();
          return registryItemSchema.parse(externalData);
        }),
      );

      registries.push(...externalResults);
    }

    const system = `Generate a Mermaid.js flowchart diagram using flowchart TD syntax based on the provided registry item data.

      The diagram should represent the main registry item and its associated components, dependencies, styling, and metadata.

      Follow this structure:

      1.  **Start** with: flowchart TD

      2.  **Root Node:**
          - Create a root node representing the main registry item: Root["<name> (<type>)"]
          - Assign the class 'root' to this node.

      3.  **Sections and Nodes (Only include sections and nodes if corresponding data exists):**

          *   **%% Files:** (Group files based on their type. Use filename without path for the node text. Add a tooltip with the full path.)
              - Pages: PageName["filename.tsx"]:::page
              - Components: CompName["filename.tsx"]:::component
              - UI Components: UIName["filename.tsx"]:::ui (map 'registry:ui' type)
              - Hooks: HookName["filename.ts"]:::hook (map 'registry:hook' type)
              - Libs: LibName["filename.ts"]:::lib (map 'registry:lib' type)
              - Blocks: BlockName["filename.tsx"]:::block (map 'registry:block' type)
              - Files: FileName["filename.ext"]:::file (map 'registry:file' type)
              - Themes: ThemeName["theme.json"]:::theme (map 'registry:theme' type)
              - Styles: StyleName["style.css"]:::style (map 'registry:style' type)
              - Data files: DataName["data.json"]:::data (Infer if possible, e.g., .json)
              - Shared Components: SharedName["filename.tsx"]:::shared (Infer if possible)
              - Create the node: NodeType["filename.ext"]:::nodeclass
              - Immediately after the node definition, add a click directive for the tooltip:
                \`click NodeId href "#" "full/path/to/filename.ext"\`
              - Example for a component:
                \`\`\`
                %% Files:
                MyComponent["component.tsx"]:::component
                click MyComponent href "#" "src/components/component.tsx"
                \`\`\`
              - Apply this pattern to all file types (Pages, Components, UI, Hooks, Libs, Blocks, Files, Themes, Styles, Data, Shared).

          *   **%% Dependencies:**
              - NPM Dependencies: NPMDep["dependency_name"]:::npm
              - Registry Dependencies: RegistryDep["dependency_name"]:::registry

          *   **%% Styling:**
              - Tailwind: Tailwind["tailwind.config.js"]:::styling (If tailwind object exists)
              - CSS Vars: CSSVars["css-vars.css"]:::styling (If cssVars array/object exists)
              - CSS: CSS["styles.css"]:::styling (If css array/object exists)

          *   **%% Metadata:**
              - Docs: Docs["<docs_value or filename>"]:::meta (If docs string exists)
              - Categories: Category["<category_name>"]:::meta (For each category)
              - Meta Properties: MetaKey["<meta_key>"]:::meta (For each key in meta object)

      4.  **Class Definitions:**
          - Only add class definitions for types of nodes that actually exist in the diagram.
          - Use these exact class names: root, page, component, ui, hook, lib, block, file, theme, style, data, shared, npm, registry, styling, meta.
          - Add definitions after all nodes: class Node1,Node2,... classtype

      5.  **Relationships (using -->):**
          - Connect the Root node to its direct files (Pages, Components, UI, Hooks, Libs, etc.).
          - Connect the Root node to its NPM and Registry Dependencies.
          - Connect the Root node to Styling nodes (Tailwind, CSSVars, CSS) if they exist.
          - Connect the Root node to Metadata nodes (Docs, Categories, Meta Properties) if they exist.
          - If possible, infer and add compositional relationships between file nodes (e.g., Page --> Component, Component --> SubComponent, Component --> Lib). Base this on typical usage patterns or hints in filenames/structure if available in the input data.
          - **Do not** add \`click\` tooltips to non-file nodes (Dependencies, Styling, Metadata).

      6.  **Output:**
          - Output only the raw Mermaid.js code.
          - No extra explanations, markdown formatting, or comments outside the %% Section Headers.
          - Do not include any \`classDef\` styling lines; styles are handled externally.
          - Do not create empty sections or nodes if the corresponding data doesn't exist.`;

    const prompt = `Generate a Mermaid.js flowchart diagram (using flowchart TD) for the following registry data, focusing on the files array and their relationships: ${JSON.stringify(
      registries,
    )}`;

    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      temperature: 0,
      system,
      prompt,
    });

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error generating Mermaid.js code:", error);
    return new Response("Failed to generate Mermaid.js code", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

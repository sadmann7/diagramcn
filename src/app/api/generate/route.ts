import { registryItemSchema } from "@/lib/validations/registry";
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

    const data = await response.json();
    const parsedData = registryItemSchema.parse(data);

    const prompt = `Generate a Mermaid.js flowchart diagram (using flowchart TD) for the following registry data, focusing on the files array and their relationships: ${JSON.stringify(
      parsedData,
    )}`;

    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      temperature: 0,
      prompt,
      system: `Generate a Mermaid.js flowchart diagram using flowchart TD syntax based on the provided registry item data.\n\n      The diagram should represent the main registry item and its associated components, dependencies, styling, and metadata.\n\n      Follow this structure:\n\n      1.  **Start** with: flowchart TD\n\n      2.  **Root Node:**\n          - Create a root node representing the main registry item: Root[\"<name> (<type>)\"]\n          - Assign the class 'root' to this node.\n\n      3.  **Sections and Nodes (Only include sections and nodes if corresponding data exists):**\n\n          *   **%% Files:** (Group files based on their type derived from common patterns or explicit types if available. Use filename without path.)\n              - Pages: PageName[\"filename.tsx\"]:::page\n              - Components: CompName[\"filename.tsx\"]:::component\n              - UI Components: UIName[\"filename.tsx\"]:::ui (map 'registry:ui' type)\n              - Hooks: HookName[\"filename.ts\"]:::hook (map 'registry:hook' type)\n              - Libs: LibName[\"filename.ts\"]:::lib (map 'registry:lib' type)\n              - Blocks: BlockName[\"filename.tsx\"]:::block (map 'registry:block' type)\n              - Files: FileName[\"filename.ext\"]:::file (map 'registry:file' type)\n              - Themes: ThemeName[\"theme.json\"]:::theme (map 'registry:theme' type)\n              - Styles: StyleName[\"style.css\"]:::style (map 'registry:style' type)\n              - Data files: DataName[\"data.json\"]:::data (Infer if possible, e.g., .json)\n              - Shared Components: SharedName[\"filename.tsx\"]:::shared (Infer if possible)\n\n          *   **%% Dependencies:**\n              - NPM Dependencies: NPMDep[\"dependency_name\"]:::npm\n              - Registry Dependencies: RegistryDep[\"dependency_name\"]:::registry\n\n          *   **%% Styling:**\n              - Tailwind: Tailwind[\"tailwind.config.js\"]:::styling (If tailwind object exists)\n              - CSS Vars: CSSVars[\"css-vars.css\"]:::styling (If cssVars array/object exists)\n              - CSS: CSS[\"styles.css\"]:::styling (If css array/object exists)\n\n          *   **%% Metadata:**\n              - Docs: Docs[\"<docs_value or filename>\"]:::meta (If docs string exists)\n              - Categories: Category[\"<category_name>\"]:::meta (For each category)\n              - Meta Properties: MetaKey[\"<meta_key>\"]:::meta (For each key in meta object)\n\n      4.  **Class Definitions:**\n          - Only add class definitions for types of nodes that actually exist in the diagram.\n          - Use these exact class names: root, page, component, ui, hook, lib, block, file, theme, style, data, shared, npm, registry, styling, meta.\n          - Add definitions after all nodes: class Node1,Node2,... classtype\n\n      5.  **Relationships (using -->):**\n          - Connect the Root node to its direct files (Pages, Components, UI, Hooks, Libs, etc.).\n          - Connect the Root node to its NPM and Registry Dependencies.\n          - Connect the Root node to Styling nodes (Tailwind, CSSVars, CSS) if they exist.\n          - Connect the Root node to Metadata nodes (Docs, Categories, Meta Properties) if they exist.\n          - If possible, infer and add compositional relationships between file nodes (e.g., Page --> Component, Component --> SubComponent, Component --> Lib). Base this on typical usage patterns or hints in filenames/structure if available in the input data.\n\n      6.  **Output:**\n          - Output only the raw Mermaid.js code.\n          - No extra explanations, markdown formatting, or comments outside the %% Section Headers.\n          - Do not include any \\\`classDef\\\` styling lines; styles are handled externally.\n          - Do not create empty sections or nodes if the corresponding data doesn't exist.`,
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

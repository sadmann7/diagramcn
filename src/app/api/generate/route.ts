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
      system: `Generate a Mermaid.js flowchart diagram using flowchart TD syntax that follows this structure:

      1. Start with: flowchart TD

      2. Only include sections and their headers if files of that type exist:
         %% Main Page
         (only if page files exist)
         
         %% Components
         (only if component files exist)
         
         %% Data Files
         (only if data files exist)
         
         %% Shared Components
         (only if shared component files exist)
         
         %% Library Files
         (only if library files exist)

      3. Node naming convention (only create nodes for files that exist):
         - Pages: PageName["filename"]
         - Components: ComponentName["filename"]
         - Data files: DataName["filename"]
         - Shared: SharedName["filename"]
         - Library: LibName["filename"]
         Note: Use just the filename without full path. Convert full paths to just the file name.

      4. Class definitions:
         - Only add class definitions for sections that have nodes
         - After each section with nodes, add: class NodeName1,NodeName2,... sectiontype
         - Use these exact classes: page, component, data, shared, lib

      5. Relations sections (only include if relevant nodes exist):
         %% Page to Components relations
         %% Components internal relations
         %% Other relations

      6. Use only --> for all relationships

      Output only the raw Mermaid.js code with no formatting, explanations, or markdown.
      Do not include any styling definitions - the styles are handled by the application.
      Do not create empty sections or nodes for file types that don't exist in the input data.`,
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

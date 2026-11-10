/**
 * @see https://ui.shadcn.com/schema/registry-item.json
 * @see https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/registry/schema.ts
 */

import { z } from "zod";

export const registryItemTypeSchema = z.enum([
  "registry:lib",
  "registry:block",
  "registry:component",
  "registry:ui",
  "registry:hook",
  "registry:page",
  "registry:file",
  "registry:theme",
  "registry:style",
  "registry:base",
  "registry:font",
  "registry:item",

  // Internal use only.
  "registry:example",
  "registry:internal",
]);

export type RegistryItemType = z.infer<typeof registryItemTypeSchema>;

// Target is required for registry:file and registry:page, but stays optional so
// a missing one is reported as an issue instead of failing the whole item.
export const registryItemFileSchema = z.looseObject({
  path: z.string(),
  content: z.string().optional(),
  type: registryItemTypeSchema,
  target: z.string().optional(),
});

export type RegistryItemFile = z.infer<typeof registryItemFileSchema>;

export const registryItemTailwindSchema = z.looseObject({
  config: z
    .looseObject({
      content: z.array(z.string()).optional(),
      theme: z.record(z.string(), z.any()).optional(),
      plugins: z.array(z.string()).optional(),
    })
    .optional(),
});

export const registryItemCssVarsSchema = z.object({
  theme: z.record(z.string(), z.string()).optional(),
  light: z.record(z.string(), z.string()).optional(),
  dark: z.record(z.string(), z.string()).optional(),
});

type CssValue = string | { [key: string]: CssValue };

export const registryItemCssSchema: z.ZodType<Record<string, CssValue>> =
  z.record(
    z.string(),
    z.lazy(() =>
      z.union([z.string(), registryItemCssSchema]),
    ) as z.ZodType<CssValue>,
  );

export const registryItemFontSchema = z.looseObject({
  family: z.string(),
  provider: z.string().optional(),
  import: z.string().optional(),
  variable: z.string().optional(),
  weight: z.array(z.string()).optional(),
  subsets: z.array(z.string()).optional(),
});

export const registryItemSchema = z.looseObject({
  $schema: z.string().optional(),
  extends: z.string().optional(),
  name: z.string(),
  type: registryItemTypeSchema,
  title: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryItemFileSchema).optional(),
  tailwind: registryItemTailwindSchema.optional(),
  cssVars: registryItemCssVarsSchema.optional(),
  css: registryItemCssSchema.optional(),
  envVars: z.record(z.string(), z.string()).optional(),
  font: registryItemFontSchema.optional(),
  meta: z.record(z.string(), z.any()).optional(),
  docs: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export type RegistryItem = z.infer<typeof registryItemSchema>;

export const registryHealthSchema = z.looseObject({
  status: z.string().optional(),
  score: z.number().optional(),
  availability30d: z.number().optional(),
  checkedAt: z.string().optional(),
});

export const registryIndexEntrySchema = z.looseObject({
  name: z.string(),
  homepage: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  health: registryHealthSchema.optional(),
  ranking: z
    .looseObject({
      score: z.number().optional(),
      itemCount: z.number().optional(),
    })
    .optional(),
});

export type RegistryIndexEntry = z.infer<typeof registryIndexEntrySchema>;

export const registryIndexSchema = z.array(registryIndexEntrySchema);

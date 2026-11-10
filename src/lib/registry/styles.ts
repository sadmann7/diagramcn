/**
 * Styles `@shadcn` items are served in, from `ui.shadcn.com/schema.json`.
 * Each library × look pair is its own set of files, so the same item can
 * differ between styles.
 */
const libraries = ["radix", "base", "aria"] as const;
const looks = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

const libraryLabels: Record<(typeof libraries)[number], string> = {
  radix: "Radix",
  base: "Base UI",
  aria: "React Aria",
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const DEFAULT_SHADCN_STYLE = "new-york-v4";

export interface ShadcnStyle {
  name: string;
  label: string;
  group: string;
}

export const shadcnStyles: ShadcnStyle[] = [
  { name: DEFAULT_SHADCN_STYLE, label: "New York", group: "Tailwind v4" },
  ...libraries.flatMap((library) =>
    looks.map((look) => ({
      name: `${library}-${look}`,
      label: capitalize(look),
      group: libraryLabels[library],
    })),
  ),
  { name: "new-york", label: "New York", group: "Tailwind v3" },
  { name: "default", label: "Default", group: "Tailwind v3" },
];

const styleNames = new Set(shadcnStyles.map((style) => style.name));

export function isShadcnStyle(value: unknown): value is string {
  return typeof value === "string" && styleNames.has(value);
}

/** A valid style from user input, or the default. */
export function getShadcnStyle(value: unknown) {
  return isShadcnStyle(value) ? value : DEFAULT_SHADCN_STYLE;
}

export function getShadcnStyleLabel(name: string) {
  const style = shadcnStyles.find((style) => style.name === name);
  if (!style) return name;
  return style.group.startsWith("Tailwind")
    ? `${style.label} (${style.group})`
    : `${style.group} ${style.label}`;
}

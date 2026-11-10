/**
 * Styles `@shadcn` items are served in, from `ui.shadcn.com/schema.json`.
 * Each library × look pair is its own set of files, so the same item can
 * differ between styles.
 */
const libraries = ["base", "aria", "radix"] as const;
const looks = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

const libraryLabels: Record<(typeof libraries)[number], string> = {
  base: "Base UI",
  aria: "React Aria",
  radix: "Radix",
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** What `shadcn init --defaults` sets up: Base UI with the Nova preset. */
export const DEFAULT_SHADCN_STYLE = "base-nova";

/** The pre-library styles, still served for existing projects. */
export const LEGACY_GROUP = "Legacy";

export interface ShadcnStyle {
  name: string;
  label: string;
  group: string;
}

export const shadcnStyles: ShadcnStyle[] = [
  ...libraries.flatMap((library) =>
    looks.map((look) => ({
      name: `${library}-${look}`,
      label: capitalize(look),
      group: libraryLabels[library],
    })),
  ),
  { name: "new-york-v4", label: "New York (Tailwind v4)", group: LEGACY_GROUP },
  { name: "new-york", label: "New York (Tailwind v3)", group: LEGACY_GROUP },
  { name: "default", label: "Default (Tailwind v3)", group: LEGACY_GROUP },
];

const styleNames = new Set(shadcnStyles.map((style) => style.name));

export function isShadcnStyle(value: unknown): value is string {
  return typeof value === "string" && styleNames.has(value);
}

/** A valid style from user input, or the default. */
export function getShadcnStyle(value: unknown) {
  return isShadcnStyle(value) ? value : DEFAULT_SHADCN_STYLE;
}

/** e.g. `Base UI Nova`, or `New York (Tailwind v4)` for legacy styles. */
export function getShadcnStyleLabel(name: string) {
  const style = shadcnStyles.find((style) => style.name === name);
  if (!style) return name;
  return style.group === LEGACY_GROUP
    ? style.label
    : `${style.group} ${style.label}`;
}

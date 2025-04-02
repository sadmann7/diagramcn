export const packageManagers = ["pnpm", "npm", "yarn", "bun"] as const;

export function parseRegistryCommand(command: string): string | null {
  const urlMatch = command.match(/https:\/\/[^"\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }

  const packageManagers = [
    { prefix: "npx shadcn", command: "npx" },
    { prefix: "yarn dlx shadcn", command: "yarn" },
    { prefix: "pnpm dlx shadcn", command: "pnpm" },
    { prefix: "bunx shadcn", command: "bun" },
  ] as const;

  for (const { prefix } of packageManagers) {
    if (command.startsWith(prefix)) {
      const match = command.match(
        new RegExp(`${prefix}@?([^\\s]+)\\s+add\\s+([^\\s]+)`),
      );
      if (!match) continue;

      const [, , component] = match;
      return `https://ui.shadcn.com/r/styles/default/${component}.json`;
    }
  }

  return null;
}

export function getPackageManagerCommands(packageManager: string) {
  switch (packageManager) {
    case "npm":
      return {
        install: "npm install",
        dlx: "npx",
      };
    case "yarn":
      return {
        install: "yarn add",
        dlx: "yarn dlx",
      };
    case "bun":
      return {
        install: "bun add",
        dlx: "bun x",
      };
    default:
      return {
        install: "pnpm add",
        dlx: "pnpm dlx",
      };
  }
}

export function getIsPackageManagerCommand(
  content: string | null | undefined,
): boolean {
  if (!content) return false;
  const words = content.toLowerCase().split(" ");

  const startsWithPackageManager = packageManagers.some(
    (pm) => words[0] === pm,
  );

  const packageManagerCommands = [
    "add",
    "install",
    "remove",
    "rm",
    "uninstall",
    "update",
    "upgrade",
    "link",
    "unlink",
    "audit",
    "dlx",
    "create",
    "exec",
    "nx",
  ] as const;

  return (
    packageManagerCommands.some((cmd) => words.includes(cmd)) ||
    startsWithPackageManager
  );
}

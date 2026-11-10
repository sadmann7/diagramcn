export const packageManagers = ["pnpm", "npm", "yarn", "bun"] as const;

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

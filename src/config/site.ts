export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "diagramcn",
  description: "Visualize shadcn registry components in diagrams",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://diagramcn.com",
  links: { github: "https://github.com/sadmann7/diagramcn" },
};

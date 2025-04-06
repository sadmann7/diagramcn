# [diagramcn](https://diagramcn.com)

A diagram visualization tool for shadcn/ui registry components.

## Features

- [x] Interactive diagram visualization
- [x] Zoom in/out and center view controls
- [x] Collapsible nodes for better organization
- [x] Focus on specific nodes
- [x] Responsive layout with mobile support
- [x] Real-time JSON parsing and visualization
- [x] Beautiful and modern UI with dark mode support

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com)
- **Diagram Components:** [Reaflow](https://github.com/reaviz/reaflow)
- **JSON Parsing:** [jsonc-parser](https://github.com/microsoft/node-jsonc-parser)
- **Validation:** [Zod](https://zod.dev)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use

1. Enter a shadcn/ui registry command or URL in the input field
2. The diagram will automatically generate showing component dependencies
3. Use the toolbar to:
   - Zoom in/out
   - Center view
   - Focus on specific nodes
4. Click on nodes to expand/collapse their children
5. Toggle between light and dark modes
6. Edit the registry JSON directly in the editor panel

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Reaflow Documentation](https://github.com/reaviz/reaflow)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Credits

- [jsoncrack.com](https://github.com/AykutSarac/jsoncrack.com) - For the json parser, node layout.

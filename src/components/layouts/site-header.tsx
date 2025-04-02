import Link from "next/link";

import { EditorToggle } from "@/app/(registry)/editor/components/editor-toggle";
import { ClientOnly } from "@/components/client-only";
import { Icons } from "@/components/icons";
import { ModeToggle } from "@/components/layouts/mode-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center gap-2">
        <ClientOnly
          fallback={
            <div className="flex aspect-square size-8 items-center justify-center">
              <Skeleton className="size-4 rounded-sm" />
            </div>
          }
        >
          <EditorToggle />
        </ClientOnly>
        <Link href="/" className="font-semibold">
          {siteConfig.name}
        </Link>
        <nav className="ml-4 flex w-full items-center gap-6 text-sm">
          <Link
            href="/editor"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Editor
          </Link>
        </nav>
        <nav className="flex flex-1 items-center md:justify-end">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link
              aria-label="GitHub repo"
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.gitHub className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

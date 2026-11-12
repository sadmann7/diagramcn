import { Button } from "@diagramcn/ui/components/button";
import Link from "next/link";

import { Icons } from "@/components/icons";
import { ModeToggle } from "@/components/layouts/mode-toggle";
import { GITHUB_URL, SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sm:px-6">
      <div className="flex h-14 items-center gap-2">
        <Link href="/" className="font-semibold">
          {SITE_NAME}
        </Link>
        <nav className="ml-4 flex items-center gap-4 text-sm">
          <Link
            href="/canvas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Canvas
          </Link>
          <Link
            href="/changes"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Changes
          </Link>
        </nav>
        <nav className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-sm"
            nativeButton={false}
            render={
              <Link
                aria-label="GitHub repo"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Icons.gitHub className="size-4" aria-hidden="true" />
          </Button>
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

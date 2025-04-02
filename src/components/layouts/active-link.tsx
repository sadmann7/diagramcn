"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import * as React from "react";

interface ActiveLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  href: string;
  children: React.ReactNode;
}

function ActiveLinkImpl({ href, className, ...props }: ActiveLinkProps) {
  const segments = useSelectedLayoutSegments();

  const isActive = React.useMemo(() => {
    if (!href) return false;

    const hrefSegments = href.split("/").filter(Boolean);
    const normalizedSegments = segments.map((s) =>
      s.replace(/^\((.+)\)$/, "$1"),
    );

    return (
      hrefSegments.length > 0 &&
      normalizedSegments.join("/").includes(hrefSegments.join("/"))
    );
  }, [href, segments]);

  return (
    <Link
      {...props}
      href={href}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground data-[state=active]:font-medium data-[state=active]:text-foreground",
        className,
      )}
    />
  );
}

export const ActiveLink = React.memo(ActiveLinkImpl, (prev, next) => {
  return prev.href === next.href;
});

"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import * as React from "react";

interface ActiveLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  href: string;
  children: React.ReactNode;
}

export function ActiveLink({ href, className, ...props }: ActiveLinkProps) {
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
      data-state={isActive ? "active" : "inactive"}
      href={href}
      className={cn(
        "text-foreground/70 transition-colors hover:text-foreground data-[state=active]:font-medium data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

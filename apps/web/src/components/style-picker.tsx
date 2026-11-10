"use client";

import { cn } from "@diagramcn/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { DEFAULT_SHADCN_STYLE, shadcnStyles } from "@/lib/registry/styles";

const groups = [...new Set(shadcnStyles.map((style) => style.group))];

interface StylePickerProps {
  value: string;
  className?: string;
}

/** Picks the `@shadcn` style, kept in the URL as `?style=`. */
export function StylePicker({ value, className }: StylePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  return (
    <select
      aria-label="shadcn style"
      value={value}
      disabled={isPending}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams);
        if (event.target.value === DEFAULT_SHADCN_STYLE) params.delete("style");
        else params.set("style", event.target.value);
        const query = params.toString().replaceAll("+", "%20");
        startTransition(() => {
          router.push(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
          });
        });
      }}
      className={cn(
        "h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50",
        className,
      )}
    >
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {shadcnStyles
            .filter((style) => style.group === group)
            .map((style) => (
              <option key={style.name} value={style.name}>
                {style.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

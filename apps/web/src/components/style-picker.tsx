"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@diagramcn/ui/components/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  DEFAULT_SHADCN_STYLE,
  getShadcnStyleLabel,
  shadcnStyles,
} from "@/lib/registry/styles";

/** Used as the value for "every style" when `allowAll` is set. */
export const ALL_STYLES = "all";

const groups = [...new Set(shadcnStyles.map((style) => style.group))];

interface StylePickerProps {
  value: string;
  /**
   * Adds an "All styles" option. The URL without `?style=` then means
   * every style instead of the default.
   */
  allowAll?: boolean;
  className?: string;
}

/** Picks the `@shadcn` style, kept in the URL as `?style=`. */
export function StylePicker({ value, allowAll, className }: StylePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Full labels for the trigger, since looks repeat across libraries.
  const items = React.useMemo(
    () => [
      ...(allowAll ? [{ value: ALL_STYLES, label: "All styles" }] : []),
      ...shadcnStyles.map((style) => ({
        value: style.name,
        label: getShadcnStyleLabel(style.name),
      })),
    ],
    [allowAll],
  );

  const onValueChange = React.useCallback(
    (next: string | null) => {
      if (!next || next === value) return;
      const params = new URLSearchParams(searchParams);
      const isUnset = allowAll
        ? next === ALL_STYLES
        : next === DEFAULT_SHADCN_STYLE;
      if (isUnset) params.delete("style");
      else params.set("style", next);
      const query = params.toString().replaceAll("+", "%20");
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [allowAll, pathname, router, searchParams, value],
  );

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      items={items}
      disabled={isPending}
    >
      <SelectTrigger aria-label="shadcn style" size="sm" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="end">
        {allowAll ? (
          <>
            <SelectGroup>
              <SelectItem value={ALL_STYLES}>All styles</SelectItem>
            </SelectGroup>
            <SelectSeparator />
          </>
        ) : null}
        {groups.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {shadcnStyles
              .filter((style) => style.group === group)
              .map((style) => (
                <SelectItem key={style.name} value={style.name}>
                  {style.label}
                  {style.name === DEFAULT_SHADCN_STYLE ? (
                    <span className="text-xs text-muted-foreground">
                      default
                    </span>
                  ) : null}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

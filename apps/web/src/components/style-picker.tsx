"use client";

import { Button } from "@diagramcn/ui/components/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@diagramcn/ui/components/combobox";
import { cn } from "@diagramcn/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  DEFAULT_SHADCN_STYLE,
  getShadcnStyleLabel,
  shadcnStyles,
} from "@/lib/registry/styles";

/** Used as the value for "every style" when `allowAll` is set. */
export const ALL_STYLES = "all";

interface StyleOption {
  value: string;
  /** Full name, shown in the trigger and matched when searching. */
  label: string;
  /** Name within its group, shown in the list. */
  shortLabel: string;
}

interface StyleGroup {
  value: string;
  items: StyleOption[];
}

const styleGroups: StyleGroup[] = [
  ...new Set(shadcnStyles.map((style) => style.group)),
].map((group) => ({
  value: group,
  items: shadcnStyles
    .filter((style) => style.group === group)
    .map((style) => ({
      value: style.name,
      label: getShadcnStyleLabel(style.name),
      shortLabel: style.label,
    })),
}));

const allStylesGroup: StyleGroup = {
  value: "",
  items: [{ value: ALL_STYLES, label: "All styles", shortLabel: "All styles" }],
};

interface StylePickerProps {
  value: string;
  /**
   * Adds an "All styles" option. The URL without `?style=` then means
   * every style instead of the default.
   */
  allowAll?: boolean;
  className?: string;
}

/** Searchable `@shadcn` style picker, kept in the URL as `?style=`. */
export function StylePicker({ value, allowAll, className }: StylePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const groups = React.useMemo(
    () => (allowAll ? [allStylesGroup, ...styleGroups] : styleGroups),
    [allowAll],
  );
  const selected = React.useMemo(
    () =>
      groups
        .flatMap((group) => group.items)
        .find((option) => option.value === value) ?? null,
    [groups, value],
  );

  const onValueChange = React.useCallback(
    (next: StyleOption | null) => {
      if (!next || next.value === value) return;
      const params = new URLSearchParams(searchParams);
      const isUnset = allowAll
        ? next.value === ALL_STYLES
        : next.value === DEFAULT_SHADCN_STYLE;
      if (isUnset) params.delete("style");
      else params.set("style", next.value);
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
    <Combobox
      items={groups}
      value={selected}
      onValueChange={onValueChange}
      itemToStringLabel={(option: StyleOption) => option.label}
      isItemEqualToValue={(option: StyleOption, other: StyleOption) =>
        option.value === other.value
      }
      disabled={isPending}
    >
      <ComboboxTrigger
        aria-label="shadcn style"
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("justify-between font-normal", className)}
          />
        }
      >
        <ComboboxValue />
      </ComboboxTrigger>
      <ComboboxContent align="end" className="w-64">
        <ComboboxInput
          showTrigger={false}
          placeholder="Search styles..."
          aria-label="Search styles"
        />
        <ComboboxEmpty>No styles match.</ComboboxEmpty>
        <ComboboxList>
          {(group: StyleGroup) => (
            <ComboboxGroup key={group.value || "all"} items={group.items}>
              {group.value ? (
                <ComboboxLabel>{group.value}</ComboboxLabel>
              ) : null}
              <ComboboxCollection>
                {(option: StyleOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.shortLabel}
                    {option.value === DEFAULT_SHADCN_STYLE ? (
                      <span className="text-xs text-muted-foreground">
                        default
                      </span>
                    ) : null}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

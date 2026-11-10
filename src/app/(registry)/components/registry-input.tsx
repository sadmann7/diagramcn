"use client";

import { ArrowRight, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCanvasHref,
  getItemHref,
  parseAddInput,
} from "@/lib/registry/specifier";
import { cn } from "@/lib/utils";

interface RegistryInputProps extends React.ComponentProps<"div"> {
  defaultValue?: string;
  autoFocus?: boolean;
}

export function RegistryInput({
  defaultValue = "",
  autoFocus,
  className,
  ...props
}: RegistryInputProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [input, setInput] = React.useState(defaultValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInput(defaultValue);
  }, [defaultValue]);

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInput(event.target.value);
    },
    [],
  );

  const onSubmit = React.useCallback(() => {
    if (!input.trim()) return;

    const specifiers = parseAddInput(input);
    if (specifiers.length === 0) {
      toast.error("No registry items found", {
        description:
          "Try @shadcn/button, an item URL, or a shadcn add command.",
      });
      return;
    }

    startTransition(() => {
      // One item opens its page; several go on the canvas together.
      const [first] = specifiers;
      router.push(
        specifiers.length === 1 && first
          ? getItemHref(first)
          : getCanvasHref(specifiers),
      );
    });
  }, [input, router]);

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        event.target instanceof HTMLElement &&
        !event.target.matches("input, textarea, [contenteditable]")
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cn("relative h-12 w-full max-w-2xl", className)} {...props}>
      <Input
        ref={inputRef}
        aria-label="Registry items"
        placeholder="@shadcn/button, @magicui/marquee, or a shadcn add command"
        className="h-full pr-10 font-mono text-sm"
        value={input}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
      />
      <Button
        aria-label="Look up"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 h-full rounded-l-none text-muted-foreground hover:text-foreground hover:dark:bg-transparent"
        onClick={onSubmit}
        disabled={isPending}
      >
        {isPending ? <Loader className="animate-spin" /> : <ArrowRight />}
      </Button>
    </div>
  );
}

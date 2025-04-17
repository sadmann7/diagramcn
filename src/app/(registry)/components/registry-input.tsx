"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegistry } from "@/hooks/use-registry";
import { parseRegistryCommand } from "@/lib/command";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface RegistryInputProps extends React.ComponentProps<"div"> {}

export function RegistryInput({ className, ...props }: RegistryInputProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const { onRegistryUrlChange } = useRegistry();
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInput(event.target.value);
    },
    [],
  );

  const onSubmit = React.useCallback(() => {
    if (!input.trim()) return;

    const command = input.trim();
    const parsedCommand = parseRegistryCommand(command) ?? command;

    try {
      startTransition(() => {
        new URL(parsedCommand);
        onRegistryUrlChange(parsedCommand);
        router.push("/registry");
      });
    } catch (_err) {
      console.error("Invalid registry URL");
    }
  }, [input, router, onRegistryUrlChange]);

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
        placeholder="Type registry here..."
        className="h-full pr-10"
        value={input}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
        autoFocus
      />
      <Button
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

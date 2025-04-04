"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRegistry } from "@/hooks/use-registry";
import { parseRegistryCommand } from "@/lib/command";
import { cn } from "@/lib/utils";
import { Loader, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface RegistryInputProps extends React.ComponentProps<"div"> {}

export function RegistryInput({ className, ...props }: RegistryInputProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const { onRegistryUrlChange } = useRegistry();
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        router.push("/editor");
      });
    } catch (_err) {
      console.error("Invalid registry URL");
    }
  }, [input, router, onRegistryUrlChange]);

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className={cn("relative w-full max-w-2xl", className)} {...props}>
      <Textarea
        ref={inputRef}
        placeholder="Type registry here..."
        className="max-h-40 resize-none pr-12"
        value={input}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
        autoFocus
      />
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 bottom-2 size-7 rounded-sm"
        onClick={onSubmit}
        disabled={isPending}
      >
        {isPending ? <Loader className="animate-spin" /> : <Send />}
      </Button>
    </div>
  );
}

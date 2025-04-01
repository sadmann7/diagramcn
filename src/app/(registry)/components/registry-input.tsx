"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useRegistry } from "./registry-provider";

interface RegistryInputProps extends React.ComponentProps<"div"> {}

export function RegistryInput({ className, ...props }: RegistryInputProps) {
  const router = useRouter();
  const { registryUrl, setRegistryUrl } = useRegistry();
  const [input, setInput] = React.useState("");

  const onSubmit = React.useCallback(() => {
    if (!input.trim()) return;

    const command = input.trim();
    const registryUrl = parseShadcnCommand(command) ?? command;

    try {
      new URL(registryUrl);
      setRegistryUrl(registryUrl);
      router.push("/editor");
    } catch (_err) {
      console.error("Invalid registry URL");
    }
  }, [input, router, setRegistryUrl]);

  console.log({ registryUrl });

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  return (
    <div className={cn("relative w-full max-w-2xl", className)} {...props}>
      <Textarea
        placeholder="Type registry here"
        className="resize-none pr-12"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 bottom-2 size-7 rounded-sm"
        onClick={onSubmit}
      >
        <Send />
      </Button>
    </div>
  );
}

function parseShadcnCommand(command: string): string | null {
  const urlMatch = command.match(/https:\/\/[^"\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }

  const packageManagers = [
    { prefix: "npx shadcn", command: "npx" },
    { prefix: "yarn dlx shadcn", command: "yarn" },
    { prefix: "pnpm dlx shadcn", command: "pnpm" },
    { prefix: "bunx shadcn", command: "bun" },
  ];

  for (const { prefix } of packageManagers) {
    if (command.startsWith(prefix)) {
      const match = command.match(
        new RegExp(`${prefix}@?([^\\s]+)\\s+add\\s+([^\\s]+)`),
      );
      if (!match) continue;

      const [, , component] = match;
      return `https://ui.shadcn.com/r/styles/default/${component}.json`;
    }
  }

  return null;
}

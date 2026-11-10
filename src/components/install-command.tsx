"use client";

import * as React from "react";

import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPackageManagerCommands, packageManagers } from "@/lib/command";

interface InstallCommandProps {
  /** What runs after the package runner, e.g. `shadcn@latest add button`. */
  command: string;
}

/** A command with a package manager picker: `pnpm dlx <command>`, etc. */
export function InstallCommand({ command }: InstallCommandProps) {
  const [packageManager, setPackageManager] =
    React.useState<(typeof packageManagers)[number]>("pnpm");

  return (
    <div className="flex min-w-0 flex-col">
      <div className="rounded-t-md border border-b-0 bg-canvas px-4 pt-1.5">
        <Tabs
          value={packageManager}
          onValueChange={(value) =>
            setPackageManager(value as typeof packageManager)
          }
        >
          <TabsList className="gap-3 bg-transparent p-0">
            {packageManagers.map((packageManager) => (
              <TabsTrigger
                key={packageManager}
                value={packageManager}
                className="rounded-none border-0 border-b border-transparent p-0 data-[state=active]:border-b-foreground data-[state=active]:bg-transparent dark:data-[state=active]:border-b-foreground dark:data-[state=active]:bg-transparent"
              >
                {packageManager}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <CodeBlock
        code={`${getPackageManagerCommands(packageManager).dlx} ${command}`}
        language="bash"
        className="rounded-b-md border border-t-0"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        isCommand
      />
    </div>
  );
}

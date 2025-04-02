"use client";

import { Button } from "@/components/ui/button";
import { Kbd, Key } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import * as React from "react";

const EDITOR_KEYBOARD_SHORTCUT = "e";

export function EditorToggle() {
  const { isEditorVisible, onEditorToggle } = useEditor();
  const isMac =
    typeof window !== "undefined" && /mac/i.test(navigator.userAgent);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === EDITOR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        onEditorToggle();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEditorToggle]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-sm"
          onClick={onEditorToggle}
        >
          {isEditorVisible ? <ChevronsLeft /> : <ChevronsRight />}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        align="start"
        sideOffset={6}
        className="flex items-center gap-2 rounded border bg-background text-accent-foreground [&>span]:hidden"
      >
        <p>{isEditorVisible ? "Hide editor" : "Show editor"}</p>
        <Kbd size="sm" className="rounded border px-1.5">
          <Key>{isMac ? "⌘" : "Ctrl"}</Key>
          <Key>E</Key>
        </Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Kbd, Key } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { getIsMac } from "@/lib/utils";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import * as React from "react";

const EDITOR_SHORTCUT = "e";

export function EditorToggle() {
  const { editorOpen, onEditorOpenChange } = useEditor();
  const isMac = getIsMac();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === EDITOR_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onEditorOpenChange();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEditorOpenChange]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-sm"
          onClick={onEditorOpenChange}
        >
          {editorOpen ? <ChevronsLeft /> : <ChevronsRight />}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        align="start"
        sideOffset={6}
        className="flex items-center gap-2 rounded border bg-background text-accent-foreground [&>span]:hidden"
      >
        <p>{editorOpen ? "Hide editor" : "Show editor"}</p>
        <Kbd size="sm" className="rounded border bg-canvas px-1.5">
          <Key>{isMac ? "⌘" : "Ctrl"}</Key>
          <Key>E</Key>
        </Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

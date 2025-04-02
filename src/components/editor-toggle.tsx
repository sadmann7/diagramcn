"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import * as React from "react";

const EDITOR_KEYBOARD_SHORTCUT = "e";

export function EditorToggle() {
  const { isEditorVisible, onEditorToggle } = useEditor();

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
          className="size-8"
          onClick={onEditorToggle}
        >
          {isEditorVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="rounded">
        <p>{isEditorVisible ? "Hide editor" : "Show editor"} (⌘/Ctrl + E)</p>
      </TooltipContent>
    </Tooltip>
  );
}

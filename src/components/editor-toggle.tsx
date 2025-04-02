"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function EditorToggle() {
  const { isEditorVisible, onEditorToggle } = useEditor();

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
        <p>{isEditorVisible ? "Hide editor" : "Show editor"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

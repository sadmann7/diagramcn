import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type * as React from "react";

interface ActionButtonProps
  extends React.ComponentProps<typeof Button>,
    Pick<
      React.ComponentProps<typeof TooltipContent>,
      "align" | "alignOffset" | "side" | "sideOffset"
    > {
  tooltip: string;
}

export function ActionButton({
  tooltip,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  asChild = false,
  ...props
}: ActionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 rounded-sm dark:hover:bg-accent/80",
              className,
            )}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          className="rounded-sm border bg-background text-accent-foreground [&>span]:hidden"
        >
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

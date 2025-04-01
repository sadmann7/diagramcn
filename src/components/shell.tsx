import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const shellVariants = cva("grid items-center gap-8 pt-6 pb-8 md:py-8", {
  variants: {
    variant: {
      default: "container",
      sidebar: "",
      centered: "container flex h-dvh max-w-2xl flex-col justify-center py-16",
      markdown: "container max-w-3xl py-8 md:py-10 lg:py-10",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ShellProps
  extends React.ComponentProps<typeof Slot>,
    VariantProps<typeof shellVariants> {
  asChild?: boolean;
}

function Shell({ className, variant, asChild, ...props }: ShellProps) {
  const Comp = asChild ? Slot : "section";

  return (
    <Comp className={cn(shellVariants({ variant }), className)} {...props} />
  );
}

export { Shell, shellVariants };

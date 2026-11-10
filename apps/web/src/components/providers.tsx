"use client";

import { TooltipProvider } from "@diagramcn/ui/components/tooltip";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <TooltipProvider delay={240}>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}

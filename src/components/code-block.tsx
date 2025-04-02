"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import {
  Prism as SyntaxHighlighter,
  type SyntaxHighlighterProps,
} from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockImplProps extends React.ComponentProps<"div"> {
  code: string;
  language?: string;
  isInstaller?: boolean;
}

function CodeBlockImpl({
  code,
  language = "typescript",
  isInstaller,
  className,
  style,
  ...props
}: CodeBlockImplProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isCopied, setIsCopied] = React.useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const composedStyle = React.useMemo<
    SyntaxHighlighterProps["customStyle"]
  >(() => {
    return {
      margin: 0,
      borderRadius: "0.5rem",
      fontFamily: "var(--font-mono)",
      fontSize: "0.875rem",
      backgroundColor: "var(--canvas)",
      color: "var(--canvas-foreground)",
      ...style,
    };
  }, [style]);

  const codeTagProps = React.useMemo<
    SyntaxHighlighterProps["codeTagProps"]
  >(() => {
    return {
      style: {
        background: "transparent",
      },
    };
  }, []);

  return (
    <div
      className={cn("group", !isInstaller && "relative", className)}
      {...props}
    >
      <div className={cn(!isInstaller && "sticky top-0")}>
        <Button
          aria-label="Copy code"
          variant="secondary"
          size="icon"
          className={cn(
            "absolute size-6 rounded border border-border/60 opacity-0 transition-[color,opacity] duration-200 hover:bg-secondary hover:text-foreground/80 disabled:opacity-100 group-hover:opacity-100",
            isInstaller ? "top-2 right-2" : "top-3 right-3",
          )}
          onClick={onCopy}
          disabled={isCopied}
        >
          {isCopied ? (
            <Check className="size-3" />
          ) : (
            <Clipboard className="size-3" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={composedStyle}
        codeTagProps={codeTagProps}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const CodeBlock = React.memo(CodeBlockImpl, (prev, next) => {
  return (
    prev.code === next.code &&
    prev.language === next.language &&
    prev.style === next.style &&
    prev.className === next.className
  );
});

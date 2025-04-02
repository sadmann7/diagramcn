"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";

interface CodeBlockImplProps extends React.ComponentProps<"div"> {
  code: string;
  language?: string;
}

function CodeBlockImpl({
  code,
  language = "typescript",
  className,
  ...props
}: CodeBlockImplProps) {
  const { resolvedTheme } = useTheme();
  const [isCopied, setIsCopied] = React.useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <div className={cn("group relative", className)} {...props}>
      <div className="sticky top-0 w-full">
        <Button
          aria-label="Copy code"
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 size-6 rounded border opacity-0 transition-opacity hover:bg-secondary hover:text-foreground/80 disabled:opacity-100 group-hover:opacity-100"
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
        style={resolvedTheme === "dark" ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const CodeBlock = React.memo(CodeBlockImpl, (prev, next) => {
  return prev.code === next.code && prev.language === next.language;
});

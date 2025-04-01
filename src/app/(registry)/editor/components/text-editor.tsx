"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCallbackRef } from "@/hooks/use-callback-ref";
import MonacoEditor, { type OnMount, type Theme } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import * as React from "react";

interface TextEditorProps
  extends Omit<React.ComponentProps<typeof MonacoEditor>, "onChange"> {
  onValueChange?: (value: string | undefined) => void;
}

export function TextEditor({
  onValueChange,
  height = "100%",
  width = "100%",
  ...props
}: TextEditorProps) {
  const { resolvedTheme } = useTheme();
  const [editorTheme, setEditorTheme] = React.useState<Theme>("light");

  const onThemeChange = useCallbackRef(() => {
    setEditorTheme(resolvedTheme === "dark" ? "vs-dark" : "light");
  });

  React.useEffect(() => {
    onThemeChange();
  }, [onThemeChange]);

  const onMount: OnMount = React.useCallback((editor) => {
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  return (
    <MonacoEditor
      height={height}
      width={width}
      theme={editorTheme}
      onChange={onValueChange}
      onMount={onMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        tabSize: 2,
        automaticLayout: true,
        fontFamily: "var(--font-mono)",
        scrollbar: {
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        padding: {
          top: 16,
          bottom: 16,
        },
        lineNumbers: "on",
        wordWrap: "on",
        renderLineHighlight: "all",
        cursorBlinking: "smooth",
        ...props.options,
      }}
      loading={<Skeleton className="h-dvh w-full" />}
      {...props}
    />
  );
}

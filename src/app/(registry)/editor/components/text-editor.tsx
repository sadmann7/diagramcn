"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEditorTheme } from "@/hooks/use-editor-theme";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import * as React from "react";

interface TextEditorProps extends React.ComponentProps<typeof MonacoEditor> {}

export function TextEditor({
  height = "100%",
  width = "100%",
  ...props
}: TextEditorProps) {
  const { editorTheme } = useEditorTheme();

  const onMount: OnMount = React.useCallback((editor) => {
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  return (
    <MonacoEditor
      height={height}
      width={width}
      onMount={onMount}
      theme={editorTheme}
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

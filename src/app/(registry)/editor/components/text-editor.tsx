"use client";

import githubDark from "@/assets/themes/github-dark.json";
import githubLight from "@/assets/themes/github-light.json";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorTheme } from "@/hooks/use-editor-theme";
import MonacoEditor, {
  type BeforeMount,
  type Monaco,
  type OnMount,
} from "@monaco-editor/react";
import * as React from "react";

interface TextEditorProps extends React.ComponentProps<typeof MonacoEditor> {}

export function TextEditor({
  height = "100%",
  width = "100%",
  ...props
}: TextEditorProps) {
  const { editorTheme } = useEditorTheme();
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);

  const beforeMount: BeforeMount = React.useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme("github-dark", {
      base: "vs-dark",
      inherit: true,
      rules: githubDark.rules ?? [],
      colors: githubDark.colors ?? {},
    });

    monaco.editor.defineTheme("github-light", {
      base: "vs",
      inherit: true,
      rules: githubLight.rules ?? [],
      colors: githubLight.colors ?? {},
    });
  }, []);

  const onMount: OnMount = React.useCallback((editor) => {
    editorRef.current = editor;
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  const currentTheme = React.useMemo(
    () => (editorTheme === "vs-dark" ? "github-dark" : "github-light"),
    [editorTheme]
  );

  return (
    <MonacoEditor
      height={height}
      width={width}
      onMount={onMount}
      beforeMount={beforeMount}
      theme={currentTheme}
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
        overviewRulerBorder: false,
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

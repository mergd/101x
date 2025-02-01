import { useCallback, useEffect, useRef } from "react";
import { type Monaco } from "@monaco-editor/react";
import type * as MonacoType from "monaco-editor";
import debounce from "lodash/debounce";

const DEBOUNCE_MS = 300; // Reduced debounce time for better responsiveness
const MIN_TRIGGER_LENGTH = 3;

export function useMonacoCompletions(
  editor: MonacoType.editor.IStandaloneCodeEditor | null
) {
  const completionsDisposableRef = useRef<MonacoType.IDisposable[]>([]);
  const monacoRef = useRef<Monaco | null>(null);

  const fetchCompletions = useCallback(async (prefix: string) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix,
          messages: [], // We could potentially add context from previous edits here
        }),
      });

      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Error fetching completions:", error);
      return [];
    }
  }, []);

  const debouncedFetchCompletions = useCallback(
    debounce(fetchCompletions, DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    if (!editor || !monacoRef.current) return;

    const monaco = monacoRef.current;

    // Clean up previous disposables
    completionsDisposableRef.current.forEach((d) => d.dispose());
    completionsDisposableRef.current = [];

    // Register inline completion provider
    completionsDisposableRef.current.push(
      monaco.languages.registerInlineCompletionsProvider("markdown", {
        async provideInlineCompletions(model, position) {
          const lineContent = model.getLineContent(position.lineNumber);
          const prefix = lineContent.substring(0, position.column - 1);

          if (prefix.trim().length < MIN_TRIGGER_LENGTH) {
            return { items: [] };
          }

          const completions = await debouncedFetchCompletions(prefix);

          return {
            items: completions.map((text: string) => ({
              text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column + text.length,
              },
              command: {
                id: "editor.action.inlineSuggest.commit",
                title: "Accept",
              },
            })),
          };
        },
        freeInlineCompletions: () => {},
      })
    );

    // Also register a completion item provider for the initial suggestions
    completionsDisposableRef.current.push(
      monaco.languages.registerCompletionItemProvider("markdown", {
        triggerCharacters: [" ", ".", "\n"],
        async provideCompletionItems(model, position) {
          const lineContent = model.getLineContent(position.lineNumber);
          const prefix = lineContent.substring(0, position.column - 1);

          if (prefix.trim().length < MIN_TRIGGER_LENGTH) {
            return { suggestions: [] };
          }

          const completions = await debouncedFetchCompletions(prefix);

          return {
            suggestions: completions.map((text: string) => ({
              label: text,
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            })),
          };
        },
      })
    );

    return () => {
      completionsDisposableRef.current.forEach((d) => d.dispose());
    };
  }, [editor, debouncedFetchCompletions]);

  return (monaco: Monaco) => {
    monacoRef.current = monaco;
  };
}

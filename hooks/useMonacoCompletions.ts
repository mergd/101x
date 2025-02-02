import { useCallback, useEffect, useRef } from "react";
import { type Monaco } from "@monaco-editor/react";
import type * as MonacoType from "monaco-editor";
import debounce from "lodash/debounce";

const VALIDATION_DEBOUNCE_MS = 600; // Longer debounce for validation
const COMPLETION_DEBOUNCE_MS = 200; // Shorter debounce for completions
const MIN_TRIGGER_LENGTH = 3;
const MARKER_OWNER = "english-validation";

interface TextValidation {
  type: "error" | "warning";
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  quickFixes?: {
    title: string;
    edits: {
      text: string;
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[];
  }[];
}

export function useMonacoCompletions(
  editor: MonacoType.editor.IStandaloneCodeEditor | null
) {
  const completionsDisposableRef = useRef<MonacoType.IDisposable[]>([]);
  const monacoRef = useRef<Monaco | null>(null);
  const lastCompletionRef = useRef<string>("");

  const validateText = useCallback(async (text: string) => {
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) return { validations: [] };
      return await response.json();
    } catch (error) {
      console.error("Error validating text:", error);
      return { validations: [] };
    }
  }, []);

  const fetchCompletions = useCallback(async (text: string) => {
    // Skip if text ends with whitespace or is same as last completion
    if (/\s$/.test(text) || text === lastCompletionRef.current) {
      return [];
    }

    try {
      const response = await fetch("/api/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) return [];
      const { completions } = await response.json();
      lastCompletionRef.current = text;
      return completions;
    } catch (error) {
      console.error("Error fetching completions:", error);
      return [];
    }
  }, []);

  const debouncedValidate = useCallback(
    debounce(validateText, VALIDATION_DEBOUNCE_MS),
    []
  );

  const debouncedFetchCompletions = useCallback(
    debounce(fetchCompletions, COMPLETION_DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    if (!editor || !monacoRef.current) return;

    const monaco = monacoRef.current;

    // Clean up previous disposables
    completionsDisposableRef.current.forEach((d) => d.dispose());
    completionsDisposableRef.current = [];

    // Register validation provider
    const validateDocument = async () => {
      const model = editor.getModel();
      if (!model) return;

      const text = model.getValue();
      const { validations } = await debouncedValidate(text);

      // Clear previous markers
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);

      // Add new markers for validations
      const markers = validations.map((validation: TextValidation) => ({
        severity:
          validation.type === "error"
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: validation.message,
        startLineNumber: validation.startLine,
        startColumn: validation.startColumn,
        endLineNumber: validation.endLine,
        endColumn: validation.endColumn,
        quickFixes: validation.quickFixes?.map((fix) => ({
          title: fix.title,
          diagnostics: [],
          edit: {
            edits: fix.edits.map((edit) => ({
              resource: model.uri,
              textEdit: {
                range: new monaco.Range(
                  edit.startLine,
                  edit.startColumn,
                  edit.endLine,
                  edit.endColumn
                ),
                text: edit.text,
              },
              modelVersionId: undefined,
            })),
          },
          kind: "quickfix",
        })),
      }));

      monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
    };

    // Register change listener for validation
    completionsDisposableRef.current.push(
      editor.onDidChangeModelContent(() => {
        validateDocument();
      })
    );

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

    // Initial validation
    validateDocument();

    return () => {
      completionsDisposableRef.current.forEach((d) => d.dispose());
      if (editor.getModel()) {
        monaco.editor.setModelMarkers(editor.getModel()!, MARKER_OWNER, []);
      }
    };
  }, [editor, debouncedValidate, debouncedFetchCompletions]);

  return (monaco: Monaco) => {
    monacoRef.current = monaco;
  };
}

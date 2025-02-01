import type { editor } from "monaco-editor";

export const markdownTheme: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "heading", foreground: "#2563eb" },
    { token: "emphasis", fontStyle: "italic" },
    { token: "strong", fontStyle: "bold" },
  ],
  colors: {
    "editor.background": "#f3f4f6",
    "editor.foreground": "#18181b",
    "editor.lineHighlightBackground": "#e5e7eb",
    "editorCursor.foreground": "#2563eb",
    "editorGhostText.foreground": "#6b7280",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#e5e7eb",
  },
};

export const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: "'Inter', system-ui, sans-serif",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on",
  padding: { top: 16, bottom: 16 },
  quickSuggestions: {
    other: "inline",
    comments: "inline",
    strings: "inline",
  },
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: false },
  lineNumbers: "off",
  glyphMargin: false,
  folding: false,
  renderLineHighlight: "none",
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  overviewRulerLanes: 0,
  theme: "markdownTheme",
  suggest: {
    insertMode: "insert",
    filterGraceful: false,
    snippetsPreventQuickSuggestions: false,
  },
  inlineSuggest: {
    enabled: true,
    mode: "prefix",
    showToolbar: "always",
  },
  acceptSuggestionOnEnter: "off",
  tabCompletion: "on",
};

"use client";

import { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Libre_Baskerville } from "next/font/google";
import { EditorMenubar } from "@/components/editor-menubar";
import { SettingsDialog } from "@/components/settings-dialog";
import { CommandPalette } from "@/components/command-palette";
import { ResizableWrapper } from "@/components/resizable-wrapper";
import { WELCOME_TEXT } from "@/lib/constants";
import { markdownTheme } from "@/lib/editor-theme";
import { useMonacoCompletions } from "@/hooks/useMonacoCompletions";

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre",
});

export default function MarkdownEditor() {
  const [content, setContent] = useState<string>(WELCOME_TEXT);
  const [isPreview, setIsPreview] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const setMonaco = useMonacoCompletions(editorRef.current);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure Monaco for markdown editing
    monaco.editor.defineTheme("markdownTheme", markdownTheme);
    monaco.editor.setTheme("markdownTheme");

    // Set up completions
    setMonaco(monaco);

    // Disable the default Cmd+Shift+L binding
    monaco.editor.addKeybindingRule({
      keybinding:
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
      command: null,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle preview with Cmd+Shift+P
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        setIsPreview(!isPreview);
      }
      // Toggle chat with Cmd+Shift+L
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "l"
      ) {
        e.preventDefault();
        setIsChatOpen(!isChatOpen);
      }
      // Handle Escape key
      if (e.key === "Escape" && editorRef.current) {
        e.preventDefault();
        editorRef.current.focus();
      }
      // Toggle command palette with Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      // Toggle settings with Cmd+,
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPreview,
    isChatOpen,
    setIsPreview,
    setIsChatOpen,
    setIsCommandOpen,
    setIsSettingsOpen,
  ]);

  return (
    <div className={`h-screen bg-white relative ${libreBaskerville.variable}`}>
      <EditorMenubar
        onCommandClick={() => setIsCommandOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onTogglePreview={() => setIsPreview(!isPreview)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />

      <div className="h-[calc(100vh-2.5rem)]">
        <ResizableWrapper
          content={content}
          isPreview={isPreview}
          isChatOpen={isChatOpen}
          onContentChange={setContent}
          onChatClose={() => setIsChatOpen(false)}
          onEditorMount={handleEditorDidMount}
        />
      </div>

      <CommandPalette
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        onTogglePreview={() => setIsPreview(!isPreview)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

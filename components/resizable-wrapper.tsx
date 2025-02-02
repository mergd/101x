"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { editorOptions } from "@/lib/editor-theme";
import { marked } from "@/lib/markdown";
import type { OnMount } from "@monaco-editor/react";
import { Editor } from "@monaco-editor/react";
import { Chat } from "./ui/chat";
import { useCallback, useState } from "react";
import * as monaco from "monaco-editor";

interface ResizableWrapperProps {
  content: string;
  isPreview: boolean;
  isChatOpen: boolean;
  onContentChange: (value: string) => void;
  onChatClose: () => void;
  onEditorMount: OnMount;
}

export function ResizableWrapper({
  content,
  isPreview,
  isChatOpen,
  onContentChange,
  onEditorMount,
}: ResizableWrapperProps) {
  const [selectedText, setSelectedText] = useState("");
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [currentSelection, setCurrentSelection] =
    useState<monaco.Selection | null>(null);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    setEditorInstance(editor);
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;

      const selection = e.selection;
      const text = model.getValueInRange(selection);
      setSelectedText(text);
      setCurrentSelection(selection);
    });
    onEditorMount(editor, monacoInstance);
  };

  const handleInlineEdit = useCallback(
    (replacement: string) => {
      if (!editorInstance || !currentSelection) return;

      const edit = {
        range: currentSelection,
        text: replacement,
        forceMoveMarkers: true,
      };

      editorInstance.executeEdits("chat", [edit]);
    },
    [editorInstance, currentSelection]
  );

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={75} minSize={50}>
        {isPreview ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel minSize={20} defaultSize={50}>
              <div className="editor-bg h-full">
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  value={content}
                  options={editorOptions}
                  onMount={handleEditorMount}
                  onChange={(value) => onContentChange(value || "")}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle className="resizable-handle" />
            <ResizablePanel minSize={20} defaultSize={50}>
              <div className="h-full p-4 prose max-w-none overflow-auto bg-white">
                {content ? (
                  <div dangerouslySetInnerHTML={{ __html: marked(content) }} />
                ) : (
                  <div className="text-zinc-400 italic">
                    Your markdown preview will appear here...
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="editor-bg h-full">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              options={editorOptions}
              onMount={handleEditorMount}
              onChange={(value) => onContentChange(value || "")}
            />
          </div>
        )}
      </ResizablePanel>
      {isChatOpen && (
        <>
          <ResizableHandle className="resizable-handle" />
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <Chat selectedText={selectedText} onInlineEdit={handleInlineEdit} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

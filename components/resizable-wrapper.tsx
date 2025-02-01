"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Editor } from "@monaco-editor/react";
import { MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { marked } from "@/lib/markdown";
import { editorOptions } from "@/lib/editor-theme";
import type { OnMount } from "@monaco-editor/react";

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
  onChatClose,
  onEditorMount,
}: ResizableWrapperProps) {
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
                  onMount={onEditorMount}
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
              onMount={onEditorMount}
              onChange={(value) => onContentChange(value || "")}
            />
          </div>
        )}
      </ResizablePanel>
      {isChatOpen && (
        <>
          <ResizableHandle className="resizable-handle" />
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full bg-white border-l border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-zinc-900">Chat</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onChatClose}
                  className="h-7 px-2"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-zinc-400 italic">
                Try asking something like:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>How do I create a table?</li>
                  <li>Format this as a blockquote</li>
                  <li>Add a code block</li>
                </ul>
              </div>
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

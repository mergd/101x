"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "./scroll-area";
import { Card } from "./card";
import { Button } from "./button";
import { Send, Plus, RefreshCw, Edit, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { chatWithAI } from "@/app/actions";
import { marked } from "@/lib/markdown";
import debounce from "lodash/debounce";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedEdit?: {
    text: string;
    diff?: {
      added: string[];
      removed: string[];
    };
  };
}

interface ChatProps {
  selectedText?: string;
  contextText?: string;
  onInlineEdit?: (replacement: string) => void;
}

function parseDiff(
  content: string
): { added: string[]; removed: string[] } | undefined {
  const diffMatch = content.match(/```diff\n([\s\S]*?)```/);
  if (!diffMatch) return undefined;

  const diffContent = diffMatch[1];
  const lines = diffContent.split("\n");

  const added = lines
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1));
  const removed = lines
    .filter((line) => line.startsWith("-"))
    .map((line) => line.slice(1));

  return { added, removed };
}

export function Chat({ selectedText, contextText, onInlineEdit }: ChatProps) {
  const EXAMPLE_PROMPTS = [
    "What should I write about?",
    "Help me debug this code",
    "Explain how this works",
    "Suggest improvements for this code",
    ...(selectedText ? ["Fix this text", "Improve this writing"] : []),
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [renderedMarkdown, setRenderedMarkdown] = useState<
    Record<string, string>
  >({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounced markdown renderer
  const debouncedRenderMarkdown = useMemo(
    () =>
      debounce(async (content: string, messageId: string) => {
        const html = await Promise.resolve(marked(content));
        setRenderedMarkdown((prev) => ({
          ...prev,
          [messageId]: html,
        }));
      }, 100),
    []
  );

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      debouncedRenderMarkdown.cancel();
    };
  }, [debouncedRenderMarkdown]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const previousMessages = messages.slice(0, messageIndex);
    setMessages(previousMessages);
    await handleSubmit(
      null,
      previousMessages[previousMessages.length - 1].content
    );
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    setTimeout(() => {
      editTextareaRef.current?.focus();
      editTextareaRef.current?.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length
      );
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const editedContent = (e.target as HTMLTextAreaElement).value;
      if (editedContent.trim() === message.content.trim()) {
        setEditingMessageId(null);
        return;
      }

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const previousMessages = messages.slice(0, messageIndex);
      setMessages(previousMessages);
      handleSubmit(null, editedContent);
      setEditingMessageId(null);
    } else if (e.key === "Escape") {
      setEditingMessageId(null);
    }
  };

  const handleAcceptEdit = (message: Message) => {
    if (!message.suggestedEdit || !onInlineEdit) return;
    onInlineEdit(message.suggestedEdit.text);
    // Remove the suggestion after accepting
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id ? { ...msg, suggestedEdit: undefined } : msg
      )
    );
  };

  const handleRejectEdit = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, suggestedEdit: undefined } : msg
      )
    );
  };

  const handleSubmit = async (
    e: React.FormEvent | null,
    overrideInput?: string
  ) => {
    e?.preventDefault();
    const submittedInput = overrideInput || input;
    if (!submittedInput.trim() || isLoading) return;

    // If there's selected text and no specific prompt, ask for improvements
    const effectiveInput =
      selectedText && !submittedInput.includes(selectedText)
        ? `Please suggest improvements to this text: ${submittedInput}`
        : submittedInput;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: effectiveInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();
      const stream = await chatWithAI(
        [...messages, userMessage],
        selectedText,
        contextText
      );
      let content = "";

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      for await (const chunk of stream) {
        if (!abortControllerRef.current) break;
        content += chunk;

        // Try to parse diff from the content
        const diff = parseDiff(content);
        if (diff && selectedText) {
          assistantMessage.suggestedEdit = {
            text: diff.added.join("\n"),
            diff,
          };
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, ...assistantMessage }
              : msg
          )
        );
        debouncedRenderMarkdown(content, assistantMessage.id);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error in chat:", error);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="text-sm font-medium">Chat</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-2">
        {selectedText && (
          <Card className="mb-4 p-3 bg-muted/50 text-xs">
            <div className="mb-2">
              <div className="text-muted-foreground mb-1 text-[10px] font-medium flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Selected Text
              </div>
              <div className="bg-primary/10 p-2 rounded">{selectedText}</div>
            </div>
          </Card>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-start space-y-1 mb-4 px-1">
            <p className="text-sm font-medium text-foreground/80">
              Try asking about:
            </p>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setInput(prompt);
                  handleSubmit(null, prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "mb-3 px-3 py-2 rounded group relative",
                message.role === "assistant" ? "bg-muted/30" : "bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-medium text-muted-foreground">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </div>
                {message.role === "user" && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditMessage(message.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRegenerateMessage(message.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editingMessageId === message.id ? (
                <Textarea
                  ref={editTextareaRef}
                  defaultValue={message.content}
                  onKeyDown={(e) => handleEditKeyDown(e, message.id)}
                  className="text-sm resize-none focus-visible:ring-1"
                  rows={1}
                  autoFocus
                />
              ) : (
                <div className="space-y-2">
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-pre:my-0">
                    {message.role === "assistant" ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            renderedMarkdown[message.id] || message.content,
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                  </div>
                  {message.suggestedEdit && (
                    <div className="mt-2 border rounded-md p-2 bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-medium text-muted-foreground">
                          Suggested Edit
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-success/20 hover:text-success"
                            onClick={() => handleAcceptEdit(message)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                            onClick={() => handleRejectEdit(message.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {message.suggestedEdit.diff ? (
                        <div className="space-y-1 font-mono text-[13px]">
                          {message.suggestedEdit.diff.removed.map((line, i) => (
                            <div
                              key={i}
                              className="bg-red-500/10 text-red-700 dark:text-red-400 px-1 rounded"
                            >
                              - {line}
                            </div>
                          ))}
                          {message.suggestedEdit.diff.added.map((line, i) => (
                            <div
                              key={i}
                              className="bg-green-500/10 text-green-700 dark:text-green-400 px-1 rounded"
                            >
                              + {line}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm font-mono bg-background rounded p-1">
                          {message.suggestedEdit.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </ScrollArea>

      <div className="relative px-2 pb-2">
        {selectedText && (
          <div className="absolute left-4 -top-8 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Text selected
          </div>
        )}
        {isStreaming && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleStopStreaming}
            className="absolute right-4 -top-8 h-6 rounded-full text-xs bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground"
          >
            Stop response
          </Button>
        )}
        <form onSubmit={handleSubmit} className="flex gap-1.5 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedText ? "Ask about the selected text..." : "Message..."
            }
            className="min-h-[44px] text-sm resize-none py-3 pr-12"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-4 bottom-4 h-6 w-6"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

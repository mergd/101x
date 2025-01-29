"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";

export default function Chat() {
  const [completions, setCompletions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCompletion, setActiveCompletion] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [context, setContext] = useState(() => {
    // Initialize context from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("writing-context") || "";
    }
    return "";
  });
  const [text, setText] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { input, handleInputChange } = useChat({
    maxSteps: 5,
    initialInput:
      typeof window !== "undefined"
        ? localStorage.getItem("writing-input") || ""
        : "",
  });

  // Save context to localStorage when it changes
  useEffect(() => {
    if (context) {
      localStorage.setItem("writing-context", context);
    } else {
      localStorage.removeItem("writing-context");
    }
  }, [context]);

  // Save input to localStorage when it changes
  useEffect(() => {
    if (input) {
      localStorage.setItem("writing-input", input);
    } else {
      localStorage.removeItem("writing-input");
    }
  }, [input]);

  const fetchCompletions = async (text: string) => {
    setIsLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ content: text }],
        context: context,
      }),
    });

    const suggestions = await response.json();
    setCompletions(suggestions);
    setIsLoading(false);
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (input.trim()) {
      timeoutRef.current = setTimeout(() => {
        setText(input);
        fetchCompletions(input);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [input]);

  const updateCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart } = textarea;

    // Create a temporary div to measure text dimensions
    const div = document.createElement("div");
    div.style.cssText = window.getComputedStyle(textarea, null).cssText;
    div.style.height = "auto";
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";

    // Get text up to cursor
    const textBeforeCursor = textarea.value.substring(0, selectionStart);
    div.textContent = textBeforeCursor;

    document.body.appendChild(div);

    // Calculate cursor position
    const textareaRect = textarea.getBoundingClientRect();
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];

    // Create another temporary div for the current line
    const lineDiv = document.createElement("div");
    lineDiv.style.cssText = div.style.cssText;
    lineDiv.textContent = currentLine;
    document.body.appendChild(lineDiv);

    const top = (lines.length - 1) * lineHeight; // Subtract 1 to start from 0
    const left = lineDiv.clientWidth;

    // Cleanup
    document.body.removeChild(div);
    document.body.removeChild(lineDiv);

    setCursorPosition({
      top: top + textareaRect.top + textarea.scrollTop,
      left: left + textareaRect.left - textarea.scrollLeft,
    });
  };

  const applyCompletion = async (index: number) => {
    if (completions[index]) {
      const completion = completions[index];
      const needsSpace =
        text.length > 0 && !text.endsWith(" ") && !completion.startsWith(" ");
      const updatedText = text + (needsSpace ? " " : "") + completion;

      // Clear completions before updating text to hide dropdown
      setCompletions([]);

      setText(updatedText);
      handleInputChange({
        target: { value: updatedText },
      } as React.ChangeEvent<HTMLInputElement>);

      // Generate new completions based on updated text
      await fetchCompletions(updatedText);
      setActiveCompletion(null);
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    const key = e.key;
    updateCursorPosition();

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      await applyCompletion(parseInt(key));
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();
      if (completions.length === 0) return;

      if (activeCompletion === null) {
        setActiveCompletion(key === "ArrowUp" ? completions.length - 1 : 0);
      } else {
        setActiveCompletion((prev) => {
          if (prev === null) return 0;
          if (key === "ArrowUp") {
            return prev === 0 ? completions.length - 1 : prev - 1;
          } else {
            return prev === completions.length - 1 ? 0 : prev + 1;
          }
        });
      }
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      setActiveCompletion(null);
    } else if (
      (key === "ArrowRight" || key === "Enter") &&
      activeCompletion !== null
    ) {
      e.preventDefault();
      await applyCompletion(activeCompletion);
    }
  };

  return (
    <div className="flex flex-col h-screen relative">
      <input
        type="text"
        className="w-full p-4 dark:bg-zinc-800 border-b border-zinc-700 focus:outline-none"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="What are you writing? (e.g. sci-fi short story, business email, poem)"
      />
      <div className="relative flex-grow">
        {(completions.length > 0 || isLoading) && (
          <div
            className="absolute z-10 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg shadow-lg"
            style={{
              top: `${cursorPosition.top}px`,
              left: `${cursorPosition.left}px`,
            }}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-500"></div>
            ) : (
              <div className="inline-flex flex-wrap gap-2">
                {completions.map((completion, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 rounded p-2 cursor-pointer ${
                      i === activeCompletion
                        ? "bg-blue-500 text-white"
                        : "hover:bg-blue-500 hover:text-white bg-zinc-100 dark:bg-zinc-800"
                    }`}
                    onClick={() => applyCompletion(i)}
                    onMouseEnter={() => setActiveCompletion(i)}
                    onMouseLeave={() => setActiveCompletion(null)}
                  >
                    <span className="font-bold">{i}:</span> {completion}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="w-full h-full p-4 dark:bg-zinc-900 resize-none focus:outline-none"
          value={input}
          placeholder="Start typing... (press 0-9 to select a completion, or use arrow keys to navigate)"
          onChange={(e) => {
            handleInputChange(e);
            updateCursorPosition();
          }}
          onKeyDown={handleKeyPress}
          onSelect={updateCursorPosition}
          onClick={updateCursorPosition}
          autoFocus
        />
      </div>
    </div>
  );
}

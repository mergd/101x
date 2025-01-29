"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";

export default function Chat() {
  const [completions, setCompletions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCompletion, setActiveCompletion] = useState<number | null>(null);
  const [model, setModel] = useState<
    "gpt-4o-mini" | "claude-3-5-sonnet-20241022"
  >("claude-3-5-sonnet-20241022");
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
        model: model,
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

    // Only handle completion-related keys when completions are showing
    if (completions.length === 0) {
      return;
    }

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      await applyCompletion(parseInt(key));
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();

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
      <div className="flex items-center dark:bg-zinc-800 border-b border-zinc-700">
        <input
          type="text"
          className="flex-grow p-4 dark:bg-zinc-800 focus:outline-none"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="What are you writing? (e.g. sci-fi short story, business email, poem)"
        />
        <select
          value={model}
          onChange={(e) =>
            setModel(
              e.target.value as "gpt-4o-mini" | "claude-3-5-sonnet-20241022"
            )
          }
          className="ml-4 mr-4 p-2 rounded dark:bg-zinc-700 focus:outline-none"
        >
          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
        </select>
      </div>
      <div className="relative flex-grow">
        <textarea
          ref={textareaRef}
          className="w-full h-full p-4 dark:bg-zinc-900 resize-none focus:outline-none"
          value={input}
          placeholder="Start typing... (press 0-9 to select a completion, or use arrow keys to navigate)"
          onChange={(e) => {
            handleInputChange(e);
          }}
          onKeyDown={handleKeyPress}
          autoFocus
        />

        {(completions.length > 0 || isLoading) && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-50 dark:bg-zinc-900 p-4 border-t border-zinc-700">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-500"></div>
            ) : (
              <div className="flex flex-col gap-2">
                {completions.map((completion, i) => (
                  <div
                    key={i}
                    className={`rounded p-2 cursor-pointer ${
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
      </div>
    </div>
  );
}

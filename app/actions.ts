"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SONNET } from "@/lib/constants";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAI(
  messages: Message[],
  selectedText?: string,
  contextText?: string
) {
  const lastMessage = messages[messages.length - 1].content;
  const systemPrompt = selectedText
    ? [
        "You are a helpful text editor.",
        "When suggesting changes to text, format them as a diff with - for deletions and + for additions, like git.",
        "Always include the full context when suggesting changes, not just the changed parts.",
        "Example format:",
        "```diff",
        "- old text",
        "+ new text",
        "```",
      ].join("\n")
    : "You are a helpful text editing assistant, powered by Claude 3.5 Sonnet. You are a delightful writer and editor. There is no image support, so don't try to render images";

  const prompt = [
    systemPrompt,
    selectedText && `\nText to modify:\n${selectedText}`,
    contextText && `\nThis is the full text of the file:\n${contextText}`,
    "\nPlease help with the following:",
    lastMessage,
  ]
    .filter(Boolean)
    .join("\n");
  console.log(prompt);

  const { textStream } = await streamText({
    model: anthropic(SONNET),
    prompt,
    temperature: 0.7,
  });

  return textStream;
}

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
  const prompt = [
    "You are a helpful AI coding assistant.",
    selectedText && `\nSelected text:\n${selectedText}`,
    contextText && `\nContext:\n${contextText}`,
    "\nPlease help with the following:",
    lastMessage,
  ]
    .filter(Boolean)
    .join("\n");

  const { textStream } = await streamText({
    model: anthropic(SONNET),
    prompt,
    temperature: 0.7,
  });

  return textStream;
}

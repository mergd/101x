import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  const contextPrompt = context ? `You are helping write ${context}. ` : "";

  const { elementStream } = streamObject({
    model: anthropic("claude-3-5-sonnet-20241022"),
    temperature: 0.9,
    output: "array",
    schema: z.object({
      completion: z
        .string()
        .describe("A natural continuation or suggestion for the text"),
    }),
    prompt: `${contextPrompt}You are an intelligent writing assistant helping to write ${
      context || "text"
    }.
    Based on what has been written so far, generate 10 different natural continuations or suggestions that could help inform the next part of the writing.
    The suggestions should vary significantly in length - some should be very short fragments (2-3 words), while others should be longer, multi-sentence continuations.
    Mix creative and unexpected suggestions with more straightforward ones.
    They can be phrases, fragments, or full sentences that could help inspire the next part of the writing.
    Current text: "${lastMessage}"`,
  });

  const completions = [];
  for await (const element of elementStream) {
    // Accept suggestions of any length to allow for variety
    completions.push(element.completion);
    if (completions.length === 10) break;
  }

  console.log(completions);

  return new Response(JSON.stringify(completions), {
    headers: { "Content-Type": "application/json" },
  });
}

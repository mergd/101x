import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

// Debounce time in milliseconds for the client side
const MAX_COMPLETIONS = 5;

interface Message {
  content: string;
  role: "user" | "assistant";
}

export async function POST(req: Request) {
  const {
    messages,
    prefix,
    model = "claude-3-5-haiku-latest",
  } = await req.json();

  if (!prefix || prefix.trim().length < 3) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = `You are an intelligent document completion assistant. Based on the following code prefix, generate ${MAX_COMPLETIONS} natural, high-quality completions that could help continue the document. The completions should be concise and helpful.
  
  Code prefix: "${prefix}"
  
  Previous messages for context (if any):
  ${
    messages?.map((m: Message) => m.content).join("\n") || "No previous context"
  }`;

  const { elementStream } = streamObject({
    model: anthropic(model),
    temperature: 0.2, // Lower temperature for more focused completions
    output: "array",
    schema: z.object({
      completion: z.string().describe("A natural code completion suggestion"),
    }),
    prompt,
  });

  const completions = [];
  try {
    for await (const element of elementStream) {
      completions.push(element.completion);
      if (completions.length === MAX_COMPLETIONS) break;
    }
  } catch (error) {
    console.error("Error generating completions:", error);
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }
  console.log(completions);

  return new Response(JSON.stringify(completions), {
    headers: { "Content-Type": "application/json" },
  });
}

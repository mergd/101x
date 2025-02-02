import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;
const MAX_COMPLETIONS = 5;

export async function POST(req: Request) {
  const { text, model = "claude-3-haiku-20240307" } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ completions: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = `You are an intelligent writing assistant. Based on the following text, generate ${MAX_COMPLETIONS} natural, high-quality completions that could help continue the writing. The completions should be concise and helpful.
  
  Text: "${text}"`;

  const { elementStream } = streamObject({
    model: anthropic(model),
    temperature: 0.2,
    output: "array",
    schema: z.object({
      completion: z.string().describe("A natural text completion suggestion"),
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
    return new Response(JSON.stringify({ completions: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ completions }), {
    headers: { "Content-Type": "application/json" },
  });
}

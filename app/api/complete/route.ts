import { HAIKU } from "@/lib/constants";
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
const MAX_COMPLETIONS = 5;

export async function POST(req: NextRequest) {
  try {
    const { text, model = HAIKU } = await req.json();

    if (!text) {
      return NextResponse.json({ completions: [] });
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
    for await (const element of elementStream) {
      completions.push(element.completion);
      if (completions.length === MAX_COMPLETIONS) break;
    }

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("Error generating completions:", error);
    return NextResponse.json({ completions: [] }, { status: 500 });
  }
}

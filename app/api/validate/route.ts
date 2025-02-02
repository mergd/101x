import { HAIKU } from "@/lib/constants";
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

interface TextValidation {
  type: "error" | "warning";
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  quickFixes?: {
    title: string;
    edits: {
      text: string;
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[];
  }[];
}

export async function POST(req: Request) {
  const { text, model = HAIKU } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ validations: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Split text into lines for accurate position tracking
  const lines = text.split("\n");
  const prompt = `You are an intelligent writing assistant that helps validate text - a bit like an LSP but for text. Analyze the following text and provide a structured list of errors (grammar/spelling issues) and warnings (style/clarity suggestions).

For each issue, provide:
1. Type: "error" for grammar/spelling or "warning" for style/clarity
2. Message: A clear explanation of the issue
3. Location: The exact position in the text (line and column numbers, 1-based)
4. Quick Fixes: Provide 1-3 possible fixes for the issue, each with:
   - A title describing the fix
   - The exact text to replace
   - The exact position where to apply the fix

Rules for validation:
- Line numbers start at 1
- Column numbers start at 1
- For each issue, the location should span the exact text that needs attention
- Don't include formatting or whitespace issues
- Focus on actual writing problems
- For spelling/grammar errors, provide specific corrections
- For style warnings, provide clear improvement suggestions

Here's the text to analyze, with line numbers:
${lines.map((line: string, i: number) => `${i + 1}| ${line}`).join("\n")}`;

  const { elementStream } = streamObject({
    model: anthropic(model),
    temperature: 0, // Keep it deterministic for validation
    output: "array",
    schema: z.object({
      validation: z
        .object({
          type: z.enum(["error", "warning"]),
          message: z.string(),
          startLine: z.number(),
          startColumn: z.number(),
          endLine: z.number(),
          endColumn: z.number(),
          quickFixes: z
            .array(
              z.object({
                title: z.string(),
                edits: z.array(
                  z.object({
                    text: z.string(),
                    startLine: z.number(),
                    startColumn: z.number(),
                    endLine: z.number(),
                    endColumn: z.number(),
                  })
                ),
              })
            )
            .optional(),
        })
        .describe("A text validation issue"),
    }),
    prompt,
  });

  const validations: TextValidation[] = [];
  try {
    for await (const element of elementStream) {
      // Validate position is within text bounds
      const validation = element.validation;
      const maxLine = lines.length;
      const maxColumn = (lineNum: number) =>
        (lines[lineNum - 1]?.length || 0) + 1;

      if (
        validation.startLine > 0 &&
        validation.startLine <= maxLine &&
        validation.endLine > 0 &&
        validation.endLine <= maxLine &&
        validation.startColumn > 0 &&
        validation.startColumn <= maxColumn(validation.startLine) &&
        validation.endColumn > 0 &&
        validation.endColumn <= maxColumn(validation.endLine)
      ) {
        validations.push(validation);
      }
    }
  } catch (error) {
    console.error("Error validating text:", error);
    return new Response(JSON.stringify({ validations: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ validations }), {
    headers: { "Content-Type": "application/json" },
  });
}

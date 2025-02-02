import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse a diff formatted string into old and new text
export function parseDiff(
  diffText: string
): { oldText: string; newText: string } | null {
  const diffRegex = /```diff\n((?:-[^\n]*\n)*)((?:\+[^\n]*\n)*)```/g;
  const match = diffRegex.exec(diffText);

  if (!match) return null;

  const oldLines = match[1]
    .split("\n")
    .filter((line) => line.startsWith("-"))
    .map((line) => line.slice(1))
    .join("\n");

  const newLines = match[2]
    .split("\n")
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1))
    .join("\n");

  return {
    oldText: oldLines.trim(),
    newText: newLines.trim(),
  };
}

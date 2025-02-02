export const WELCOME_TEXT = `# Welcome to the Markdown Editor

Start typing here...

## Features
- Real-time preview
- Syntax highlighting
- Keyboard shortcuts
- Command palette

Try using **bold**, *italic*, or \`code\` formatting.`;

export const KEY_BINDINGS = [
  { key: "⌘⇧P", description: "Toggle Preview" },
  { key: "⌘⇧L", description: "Toggle Chat" },
  { key: "⌘K", description: "Open Command Palette" },
  { key: "⌘,", description: "Open Settings" },
  { key: "Esc", description: "Focus Editor" },
];

export const COMMANDS = [
  {
    label: "Toggle Preview",
    shortcut: "⌘⇧P",
    action: "togglePreview",
  },
  {
    label: "Toggle Chat",
    shortcut: "⌘⇧L",
    action: "toggleChat",
  },
  {
    label: "Settings",
    shortcut: "⌘,",
    action: "openSettings",
  },
];

export const SONNET = "claude-3-5-sonnet-20241022";
export const HAIKU = "claude-3-5-haiku-20241022";

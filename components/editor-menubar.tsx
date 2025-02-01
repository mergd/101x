import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Command, Settings } from "lucide-react";
import { COMMANDS } from "@/lib/constants";

interface EditorMenubarProps {
  onCommandClick: () => void;
  onSettingsClick: () => void;
  onTogglePreview: () => void;
  onToggleChat: () => void;
}

export function EditorMenubar({
  onCommandClick,
  onSettingsClick,
  onTogglePreview,
  onToggleChat,
}: EditorMenubarProps) {
  const getActionHandler = (action: string) => {
    switch (action) {
      case "togglePreview":
        return onTogglePreview;
      case "toggleChat":
        return onToggleChat;
      case "openSettings":
        return onSettingsClick;
      default:
        return () => {};
    }
  };

  return (
    <div className="h-10 flex items-center justify-between px-4 bg-zinc-50/80 border-b border-zinc-200">
      <div className="flex items-center gap-2">
        <Tooltip content={<span className="text-xs">Open commands (⌘K)</span>}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-zinc-600 hover:text-zinc-900"
            onClick={onCommandClick}
          >
            <Command className="w-4 h-4 mr-1" />
            <span className="text-xs">Commands</span>
          </Button>
        </Tooltip>

        <div className="h-4 w-px bg-zinc-200" />

        {COMMANDS.slice(0, -1).map((cmd, i) => (
          <Tooltip
            key={i}
            content={<span className="text-xs">{cmd.shortcut}</span>}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-zinc-600 hover:text-zinc-900"
              onClick={getActionHandler(cmd.action)}
            >
              <span className="text-xs">{cmd.label}</span>
            </Button>
          </Tooltip>
        ))}
      </div>

      <Tooltip content={<span className="text-xs">Settings (⌘,)</span>}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onSettingsClick}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </Tooltip>
    </div>
  );
}

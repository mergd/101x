import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { COMMANDS } from "@/lib/constants";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePreview: () => void;
  onToggleChat: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onTogglePreview,
  onToggleChat,
  onOpenSettings,
}: CommandPaletteProps) {
  const getActionHandler = (action: string) => {
    switch (action) {
      case "togglePreview":
        return onTogglePreview;
      case "toggleChat":
        return onToggleChat;
      case "openSettings":
        return onOpenSettings;
      default:
        return () => {};
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          {COMMANDS.map((cmd, i) => (
            <CommandItem key={i} onSelect={getActionHandler(cmd.action)}>
              {cmd.label}
              <CommandShortcut>{cmd.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

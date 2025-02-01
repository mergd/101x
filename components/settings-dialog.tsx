import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEY_BINDINGS } from "@/lib/constants";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Keyboard shortcuts and preferences
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {KEY_BINDINGS.map((binding, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-600">{binding.description}</span>
                  <kbd className="px-2 py-0.5 text-xs bg-zinc-100 rounded-md border border-zinc-200">
                    {binding.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

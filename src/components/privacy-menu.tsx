"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { anyHidden } from "@/lib/privacy";
import { updateSettings } from "@/lib/repo/settings";
import { strings } from "@/lib/strings";
import type { PrivacySettings } from "@/types";

const KINDS: { key: keyof PrivacySettings; label: string }[] = [
  { key: "hideIncome", label: strings.income },
  { key: "hideExpense", label: strings.expense },
  { key: "hideNet", label: strings.net },
  { key: "hideBalance", label: strings.balance },
];

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <div className="flex-1">
        <Label htmlFor={id} className="text-base font-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Eye button that opens per-kind show/hide settings. */
export function PrivacyMenu() {
  const { privacy, autoHideOnBackground } = usePrivacy();
  const someHidden = anyHidden(privacy);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label={strings.privacy}>
          {someHidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-1 font-medium">{strings.showAmounts}</p>
        {KINDS.map(({ key, label }) => (
          <SwitchRow
            key={key}
            id={key}
            label={label}
            checked={!privacy[key]}
            onChange={(show) => updateSettings({ privacy: { [key]: !show } })}
          />
        ))}
        <p className="mt-1 text-xs text-muted-foreground">{strings.privacyHint}</p>
        <div className="mt-3 border-t pt-2">
          <SwitchRow
            id="autoHideOnBackground"
            label={strings.autoHideOnBackground}
            hint={strings.autoHideHint}
            checked={autoHideOnBackground}
            onChange={(checked) => updateSettings({ autoHideOnBackground: checked })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

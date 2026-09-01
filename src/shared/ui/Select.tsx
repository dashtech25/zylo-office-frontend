"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
}

/** Select accessible (clavier, aria) — remplace le pattern <select> natif
 * stylé / Dropdown maison observé chez AlloTech (§12 du rapport signale
 * l'absence de navigation clavier sur son Dropdown maison). */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-input border border-border bg-surface px-3 text-body-md text-text",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed",
          "data-[placeholder]:text-text-disabled",
          invalid && "border-error focus-visible:border-error focus-visible:ring-error/30"
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-text-muted" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-card border border-border bg-surface shadow-elevated"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-button py-2 pl-8 pr-3 text-body-md text-text outline-none",
                  "data-[highlighted]:bg-primary-muted data-[highlighted]:text-primary",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4" aria-hidden />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

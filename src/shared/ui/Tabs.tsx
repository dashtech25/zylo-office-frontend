"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/shared/lib/cn";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: "underline" | "pills";
}

export function Tabs({ items, defaultValue, value, onValueChange, variant = "underline" }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        className={cn("flex items-center gap-1", variant === "underline" ? "border-b border-border-subtle" : "rounded-card bg-surface-muted p-1")}
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              "text-body-sm font-medium text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "disabled:pointer-events-none disabled:opacity-50",
              variant === "underline"
                ? "border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                : "rounded-button px-3 py-1.5 data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-soft"
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="pt-4">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}

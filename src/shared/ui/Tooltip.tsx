"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-50 rounded-button bg-secondary px-2.5 py-1.5 text-caption text-white shadow-elevated"
          >
            {content}
            <RadixTooltip.Arrow className="fill-secondary" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

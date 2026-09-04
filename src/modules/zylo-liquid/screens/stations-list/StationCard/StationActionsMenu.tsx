import { MoreVertical } from "lucide-react";
import type { RefObject } from "react";

import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/shared/ui";

export function StationActionsMenu({
  isOpen,
  onToggle,
  menuRef,
  viewDetailHref,
  viewDetailLabel,
  editLabel,
  onEdit,
  toggleStatusLabel,
  onToggleStatus,
  alertsHref,
  alertsLabel,
  deliveriesHref,
  deliveriesLabel,
  leaksHref,
  leaksLabel,
}: {
  isOpen: boolean;
  onToggle: () => void;
  menuRef?: RefObject<HTMLDivElement | null>;
  viewDetailHref: string;
  viewDetailLabel: string;
  editLabel: string;
  onEdit: () => void;
  toggleStatusLabel: string;
  onToggleStatus: () => void;
  alertsHref: string;
  alertsLabel: string;
  deliveriesHref: string;
  deliveriesLabel: string;
  leaksHref: string;
  leaksLabel: string;
}) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm" onClick={onToggle} aria-haspopup="menu">
        <MoreVertical className="size-4" aria-hidden />
      </Button>
      <DropdownMenu open={isOpen} menuRef={menuRef}>
        <DropdownMenuItem href={viewDetailHref}>{viewDetailLabel}</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleStatus}>{toggleStatusLabel}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem href={alertsHref}>{alertsLabel}</DropdownMenuItem>
        <DropdownMenuItem href={deliveriesHref}>{deliveriesLabel}</DropdownMenuItem>
        <DropdownMenuItem href={leaksHref}>{leaksLabel}</DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}

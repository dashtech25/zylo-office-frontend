import type { RefObject } from "react";

import { StationActionsMenu } from "./StationActionsMenu";
import { StationDetailArrowLink } from "./StationDetailArrowLink";

export function StationActionsCell({
  menuOpen,
  menuRef,
  onToggleMenu,
  detailHref,
  detailLabel,
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
  menuOpen: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  onToggleMenu: () => void;
  detailHref: string;
  detailLabel: string;
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
    <div className="flex w-[6%] flex-nowrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <StationActionsMenu
        isOpen={menuOpen}
        onToggle={onToggleMenu}
        menuRef={menuRef}
        viewDetailHref={detailHref}
        viewDetailLabel={detailLabel}
        editLabel={editLabel}
        onEdit={onEdit}
        toggleStatusLabel={toggleStatusLabel}
        onToggleStatus={onToggleStatus}
        alertsHref={alertsHref}
        alertsLabel={alertsLabel}
        deliveriesHref={deliveriesHref}
        deliveriesLabel={deliveriesLabel}
        leaksHref={leaksHref}
        leaksLabel={leaksLabel}
      />
      <StationDetailArrowLink href={detailHref} label={detailLabel} />
    </div>
  );
}

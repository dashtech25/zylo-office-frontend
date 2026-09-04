import Link from "next/link";

import type { StationRow } from "../useStationsList";
import { StatusDot } from "./StatusDot";

export function StationIdentityCell({
  name,
  href,
  state,
  cityName,
}: {
  name: string;
  href: string;
  state: StationRow["state"];
  cityName: string | null;
}) {
  return (
    <div className="w-[20%] pr-2">
      <div className="flex items-center gap-1.5">
        <StatusDot state={state} />
        <Link href={href} onClick={(e) => e.stopPropagation()} className="font-semibold text-text hover:text-primary hover:underline">
          {name}
        </Link>
      </div>
      {cityName && <div className="ml-3.5 text-caption text-text-muted">{cityName}</div>}
    </div>
  );
}

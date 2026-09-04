import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/shared/ui";

export function StationDetailArrowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={label} title={label}>
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

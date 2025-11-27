import * as React from "react";
import { Button } from "@zoracore/ui";

type CTAGroupProps = {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTAGroup({ primaryLabel, primaryHref, secondaryLabel, secondaryHref }: CTAGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild>
        <a href={primaryHref} className="focus-visible:outline-none focus-visible:ring-2">
          {primaryLabel}
        </a>
      </Button>
      {secondaryLabel && secondaryHref ? (
        <Button variant="ghost" asChild>
          <a href={secondaryHref} className="focus-visible:outline-none focus-visible:ring-2">
            {secondaryLabel}
          </a>
        </Button>
      ) : null}
    </div>
  );
}

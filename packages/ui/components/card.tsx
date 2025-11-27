import * as React from "react";
import { cn } from "../theme/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-foreground/10 bg-background text-foreground shadow-brand transition-shadow hover:shadow-lg focus-within:shadow-lg",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";

export { Card };

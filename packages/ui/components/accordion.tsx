import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../theme/utils";

type AccordionContextValue = {
  openItems: Set<string>;
  toggle: (id: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

export function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  children,
  className
}: {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (val: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const initial = React.useMemo(() => {
    if (value) return Array.isArray(value) ? new Set(value) : new Set([value]);
    if (defaultValue) return Array.isArray(defaultValue) ? new Set(defaultValue) : new Set([defaultValue]);
    return new Set<string>();
  }, [value, defaultValue]);

  const [openItems, setOpenItems] = React.useState<Set<string>>(initial);

  React.useEffect(() => {
    if (!value) return;
    setOpenItems(Array.isArray(value) ? new Set(value) : new Set([value]));
  }, [value]);

  const toggle = React.useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (type === "single") {
          next.clear();
          next.add(id);
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        const payload = type === "single" ? [...next][0] ?? "" : Array.from(next);
        onValueChange?.(payload as string | string[]);
        return next;
      });
    },
    [onValueChange, type]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionItem must be used within Accordion");
  const isOpen = ctx.openItems.has(id);
  return (
    <div className="rounded-lg border border-foreground bg-background">
      <button
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
        aria-expanded={isOpen}
        onClick={() => ctx.toggle(id)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
      </button>
      {isOpen ? <div className="border-t border-foreground px-4 py-3 text-sm text-foreground">{children}</div> : null}
    </div>
  );
}

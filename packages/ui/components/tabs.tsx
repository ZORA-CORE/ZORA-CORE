import * as React from "react";
import { cn } from "../theme/utils";

type TabsContextValue = {
  value: string;
  setValue: (val: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  value,
  onValueChange,
  children,
  className
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = React.useState<string>(value ?? "");

  const current = value ?? internal;

  const setValue = React.useCallback(
    (val: string) => {
      setInternal(val);
      onValueChange?.(val);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("flex flex-col gap-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-foreground/20 bg-background p-1" role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2",
        isActive ? "bg-primary text-background shadow-brand" : "text-foreground"
      )}
      onClick={() => ctx.setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className="rounded-lg border border-foreground/20 bg-background p-4 shadow-brand">
      {children}
    </div>
  );
}

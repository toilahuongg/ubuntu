"use client";

import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripDiacritics } from "@/lib/utils/text";
import type { CustomerCaregiverOption } from "@/lib/services/customer-service";

type UserComboboxProps = {
  options: CustomerCaregiverOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
};

export function UserCombobox({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Tìm kiếm người dùng…",
  maxSelections,
  disabled = false,
  className,
}: UserComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close popup on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter options by query (diacritic-insensitive)
  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = stripDiacritics(query);
    return options.filter(
      (o) =>
        stripDiacritics(o.fullName).includes(q) ||
        stripDiacritics(o.roleLabel).includes(q),
    );
  }, [options, query]);

  // Build items grouped by role
  const grouped = React.useMemo(() => {
    const map = new Map<string, CustomerCaregiverOption[]>();
    for (const opt of filtered) {
      const label = opt.roleLabel ?? "Khác";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(opt);
    }
    return map;
  }, [filtered]);

  const isSelected = React.useCallback(
    (id: string) =>
      multiple ? (value as string[]).includes(id) : value === id,
    [multiple, value],
  );

  const handleSelect = React.useCallback(
    (id: string) => {
      if (multiple) {
        const current = value as string[];
        if (current.includes(id)) {
          onChange(current.filter((v) => v !== id));
        } else if (!maxSelections || current.length < maxSelections) {
          onChange([...current, id]);
        }
      } else {
        onChange(id);
      }
    },
    [multiple, value, maxSelections, onChange],
  );

  const selectedLabels = React.useMemo(() => {
    if (multiple) {
      return (value as string[]).map((id) => {
        const opt = options.find((o) => o.id === id);
        return opt?.fullName ?? "";
      });
    }
    const opt = options.find((o) => o.id === value);
    return opt ? [opt.fullName] : [];
  }, [multiple, value, options]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Selected chips (multi-select mode) */}
      {multiple && selectedLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedLabels.map((label, i) => {
            const id = (value as string[])[i];
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-medium ring-1 ring-border"
              >
                {label}
                <button
                  type="button"
                  disabled={(value as string[]).length <= 1}
                  onClick={() => handleSelect(id)}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-overlay-medium hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Bỏ người dùng"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Single-select: show selected value */}
      {!multiple && value && selectedLabels[0] && (
        <div className="mb-1 text-xs text-foreground">{selectedLabels[0]}</div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
      </div>

      {/* Filtered results list */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-sm">
          {Object.entries(grouped).length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Không tìm thấy người dùng
            </div>
          ) : (
            Object.entries(grouped).map(([roleLabel, items]) => (
              <div key={roleLabel}>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {roleLabel}
                </div>
                {items.map((user: CustomerCaregiverOption) => {
                  const selected = isSelected(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        handleSelect(user.id);
                        if (!multiple) {
                          setOpen(false);
                          setQuery("");
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition hover:bg-overlay-subtle",
                        selected && "bg-primary/10 font-medium",
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          selected ? "text-primary" : "text-transparent",
                        )}
                      />
                      <span className="truncate">{user.fullName}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {user.roleLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

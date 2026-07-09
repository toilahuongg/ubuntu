"use client";

import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerCaregiverOption } from "@/lib/services/customer-service";
import { searchCaregiversAction } from "@/app/(app)/customers/actions";

type UserComboboxProps = {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  /** Pre-selected options to display names for already-selected IDs */
  selectedOptions?: CustomerCaregiverOption[];
};

export function UserCombobox({
  value,
  onChange,
  multiple = false,
  placeholder = "Tìm kiếm người dùng…",
  maxSelections,
  disabled = false,
  className,
  selectedOptions = [],
}: UserComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CustomerCaregiverOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge pre-selected options with search results for display
  const allKnown = React.useMemo(() => {
    const map = new Map<string, CustomerCaregiverOption>();
    for (const opt of selectedOptions) map.set(opt.id, opt);
    for (const opt of results) map.set(opt.id, opt);
    return Array.from(map.values());
  }, [selectedOptions, results]);

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

  // Server-side search with debounce
  const doSearch = React.useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await searchCaregiversAction(q);
      if (result.ok && result.data) {
        setResults(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

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
        const opt = allKnown.find((o) => o.id === id);
        return opt?.fullName ?? "";
      });
    }
    const opt = allKnown.find((o) => o.id === value);
    return opt ? [opt.fullName] : [];
  }, [multiple, value, allKnown]);

  // Build items grouped by role
  const grouped = React.useMemo(() => {
    const map = new Map<string, CustomerCaregiverOption[]>();
    for (const opt of results) {
      const label = opt.roleLabel ?? "Khác";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(opt);
    }
    return map;
  }, [results]);

  const hasResults = Object.entries(grouped).length > 0;
  const showEmpty = query.trim().length > 0 && !loading && !hasResults;

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
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground/60" />
        )}
      </div>

      {/* Search results list */}
      {open && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang tìm…
            </div>
          ) : showEmpty ? (
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

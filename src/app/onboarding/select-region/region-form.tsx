"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";

type RegionGroup = {
  teamId: string;
  teamName: string;
  regions: { id: string; name: string; code: string }[];
};

export function RegionForm({ groups }: { groups: RegionGroup[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/onboarding/select-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId: selectedId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Không thể lưu khu vực.");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setStatus("error");
      setError("Không thể kết nối máy chủ.");
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.teamId}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.teamName}
            </p>
            <div className="space-y-1">
              {group.regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setSelectedId(region.id)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                    selectedId === region.id
                      ? "bg-white/12 text-foreground"
                      : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{region.name}</span>
                  {selectedId === region.id && (
                    <Check className="h-4 w-4 text-foreground" />
                  )}
                </button>
              ))}
              {group.regions.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground/60">
                  Chưa có khu vực nào
                </p>
              )}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có khu vực nào được tạo.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedId || status === "loading"}
        onClick={handleSubmit}
        className="btn-gradient mt-4 flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
        ) : (
          <>
            Tiếp tục
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

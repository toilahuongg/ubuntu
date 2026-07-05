"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type ClassOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
};

export function DttLeaderboardFilters({
  classes,
  tasks,
  activeClassId,
  activeTaskId,
  showClassSelect,
}: {
  classes: ClassOption[];
  tasks: TaskOption[];
  activeClassId?: string;
  activeTaskId?: string;
  showClassSelect: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleClassChange(classId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) {
      params.set("classId", classId);
    } else {
      params.delete("classId");
    }
    params.delete("taskId");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleTaskChange(taskId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (taskId && taskId !== "weekly-total") {
      params.set("taskId", taskId);
    } else {
      params.delete("taskId");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {showClassSelect && classes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Lớp học
          </label>
          <select
            className="min-h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 cursor-pointer"
            value={activeClassId || ""}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={isPending}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Nhiệm vụ ĐTT
        </label>
        <select
          className="min-h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 cursor-pointer"
          value={activeTaskId || "weekly-total"}
          onChange={(e) => handleTaskChange(e.target.value)}
          disabled={isPending}
        >
          <option value="weekly-total">Cả tuần (Tổng điểm)</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Book } from "lucide-react";
import { Switch } from "@base-ui/react/switch";
import { toggleTaskDttAction } from "./actions";
import {
  mergeDttTaskState,
  type DttTaskItem,
  type DttTaskOverrides,
} from "./dtt-task-state";
import { FormError, FormSuccess } from "../_shared";

export function DttTaskTab({ tasks }: { tasks: DttTaskItem[] }) {
  const [localDttOverrides, setLocalDttOverrides] =
    useState<DttTaskOverrides>({});
  const taskItems = useMemo(
    () => mergeDttTaskState(tasks, localDttOverrides),
    [tasks, localDttOverrides]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep track of which task ID is currently being toggled
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const handleToggleDtt = (taskId: string, nextIsDtt: boolean) => {
    const previousIsDtt =
      taskItems.find((task) => task.id === taskId)?.isDtt ?? !nextIsDtt;
    setTogglingTaskId(taskId);
    setError(null);
    setSuccess(null);
    setLocalDttOverrides((current) => ({ ...current, [taskId]: nextIsDtt }));

    startTransition(async () => {
      const res = await toggleTaskDttAction(taskId, nextIsDtt);
      setTogglingTaskId(null);
      if (res.ok) {
        const taskTitle = taskItems.find((t) => t.id === taskId)?.title || "";
        setSuccess(
          nextIsDtt
            ? `Đã thêm nhiệm vụ "${taskTitle}" vào Trường học ĐTT.`
            : `Đã rút nhiệm vụ "${taskTitle}" khỏi Trường học ĐTT.`
        );
      } else {
        setLocalDttOverrides((current) => ({
          ...current,
          [taskId]: previousIsDtt,
        }));
        setError(res.error);
      }
    });
  };

  const filteredTasks = taskItems.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and control bar */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Danh sách nhiệm vụ hoạt động</h3>
        </div>

        {/* Search bar */}
        <div className="relative max-w-xs w-full">
          <label htmlFor="dtt-task-search" className="sr-only">
            Tìm kiếm nhiệm vụ
          </label>
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/75" />
          <input
            id="dtt-task-search"
            type="text"
            placeholder="Tìm kiếm nhiệm vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-overlay-subtle pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

      {/* Task list with individual modern row cards */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-overlay-subtle/20 p-6 text-center text-sm text-muted-foreground">
            Không tìm thấy nhiệm vụ nào phù hợp
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isTaskToggling = togglingTaskId === task.id && isPending;
            const switchTrackClass = task.isDtt
              ? "border-primary bg-primary"
              : "border-border/50 bg-overlay-subtle";
            const switchThumbClass = task.isDtt ? "translate-x-4" : "";

            return (
              <div
                key={task.id}
                className="flex min-h-16 items-center justify-between rounded-lg border border-border/50 bg-background/70 px-3 py-2 transition-colors duration-150 hover:border-primary/30 hover:bg-overlay-subtle/25"
              >
                <div className="flex min-w-0 items-center gap-3 pr-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-overlay-subtle">
                    <Book className={`h-4.5 w-4.5 ${task.isDtt ? "text-primary" : "text-muted-foreground/75"}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate text-foreground">{task.title}</h4>
                    <div className="mt-1 flex items-center gap-2">
                      {task.isDtt ? (
                        <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          Nhiệm vụ ĐTT
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-border/70 bg-overlay-subtle px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Nhiệm vụ Thường
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="flex items-center">
                  <Switch.Root
                    checked={task.isDtt}
                    onCheckedChange={(checked) => handleToggleDtt(task.id, checked)}
                    disabled={isTaskToggling}
                    aria-label={`Đặt làm nhiệm vụ ĐTT cho ${task.title}`}
                    className="group relative inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span
                      aria-hidden
                      className={`absolute left-2 top-1/2 h-6 w-10 -translate-y-1/2 rounded-full border transition-colors duration-150 group-hover:bg-overlay-medium ${switchTrackClass}`}
                    />
                    {isTaskToggling ? (
                      <span
                        className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-transparent ${switchThumbClass}`}
                      />
                    ) : (
                      <Switch.Thumb
                        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background shadow-sm transition-transform duration-150 ease-in-out ${switchThumbClass}`}
                      />
                    )}
                  </Switch.Root>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

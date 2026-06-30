"use client";

import { useState, useTransition } from "react";
import { Search, Book, Sparkles, BookOpen } from "lucide-react";
import { toggleTaskDttAction } from "./actions";
import { FormError, FormSuccess } from "../_shared";

type TaskItem = {
  id: string;
  title: string;
  isDtt: boolean;
};

export function DttTaskTab({ tasks }: { tasks: TaskItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep track of which task ID is currently being toggled
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const handleToggleDtt = (taskId: string, currentIsDtt: boolean) => {
    const nextIsDtt = !currentIsDtt;
    setTogglingTaskId(taskId);
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await toggleTaskDttAction(taskId, nextIsDtt);
      setTogglingTaskId(null);
      if (res.ok) {
        const taskTitle = tasks.find(t => t.id === taskId)?.title || "";
        setSuccess(
          nextIsDtt
            ? `Đã thêm nhiệm vụ "${taskTitle}" vào Trường học ĐTT.`
            : `Đã rút nhiệm vụ "${taskTitle}" khỏi Trường học ĐTT.`
        );
      } else {
        setError(res.error);
      }
    });
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and control bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/40">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Danh sách nhiệm vụ hoạt động</h3>
        </div>

        {/* Search bar */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/75" />
          <input
            type="text"
            placeholder="Tìm kiếm nhiệm vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl bg-overlay-subtle border border-border pl-9 pr-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

      {/* Task list with individual modern row cards */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="glass-card p-8 text-center text-xs text-muted-foreground/60 border border-border/40 rounded-2xl">
            Không tìm thấy nhiệm vụ nào phù hợp
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isTaskToggling = togglingTaskId === task.id && isPending;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-overlay-subtle/20 border border-border/40 hover:border-border/80 hover:bg-overlay-subtle/40 transition-all duration-200 shadow-sm"
              >
                <div className="min-w-0 pr-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-overlay-subtle border border-border/40 flex items-center justify-center shrink-0">
                    <Book className={`h-4.5 w-4.5 ${task.isDtt ? "text-primary" : "text-muted-foreground/75"}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate text-foreground">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {task.isDtt ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Nhiệm vụ ĐTT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-overlay-subtle text-muted-foreground border border-border/60">
                          Nhiệm vụ Thường
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={isTaskToggling}
                    onClick={() => handleToggleDtt(task.id, task.isDtt)}
                    aria-label={`Đặt làm nhiệm vụ ĐTT cho ${task.title}`}
                    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border border-border/40 transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-wait disabled:opacity-50 ${
                      task.isDtt ? "bg-primary border-primary" : "bg-overlay-subtle hover:bg-overlay-medium"
                    }`}
                  >
                    {isTaskToggling ? (
                      <span className="absolute left-1 top-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                    ) : (
                      <span
                        pointer-events-none="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md transition duration-200 ease-in-out ${
                          task.isDtt ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

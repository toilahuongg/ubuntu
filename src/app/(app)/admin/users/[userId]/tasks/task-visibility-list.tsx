"use client";

import { useState, useTransition } from "react";
import { toggleTaskVisibilityAction } from "./actions";
import { SCOPE_LABELS, ROLE_LABELS } from "@/lib/domain";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  scope: string;
  targetRoles: string[];
  defaultVisible: boolean;
  currentVisible: boolean;
};

export function TaskVisibilityList({
  userId,
  tasks,
}: {
  userId: string;
  tasks: TaskItem[];
}) {
  const [taskList, setTaskList] = useState(tasks);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (taskId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    startTransition(async () => {
      const result = await toggleTaskVisibilityAction(userId, taskId, newVal);
      if (result.success) {
        setTaskList((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, currentVisible: newVal } : t))
        );
      } else {
        alert(result.error || "Có lỗi xảy ra khi cập nhật hiển thị.");
      }
    });
  };

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {taskList.map((task) => (
        <div key={task.id} className="flex items-center justify-between p-4">
          <div className="mr-4 space-y-1">
            <h3 className="text-sm font-medium">{task.title}</h3>
            <p className="text-[11px] text-muted-foreground">
              Phạm vi: {SCOPE_LABELS[task.scope as any]} · Vai trò: {task.targetRoles.map(r => ROLE_LABELS[r as any]).join(", ")}
            </p>
            {task.defaultVisible !== task.currentVisible && (
              <span className="inline-block text-[9px] bg-yellow-500/10 text-yellow-700 font-medium px-1 rounded">
                Đã cấu hình lại
              </span>
            )}
          </div>
          <button
            onClick={() => handleToggle(task.id, task.currentVisible)}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/60 ${
              task.currentVisible ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                task.currentVisible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

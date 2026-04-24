"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";

import { deleteTaskAction, moveTaskAction, toggleTaskAction } from "./actions";
import { EditTemplateForm } from "./edit-template-form";
import { ROLE_LABELS, SCOPE_LABELS, targetsAllRoles } from "@/lib/domain";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import { formatTaskScheduleLabel } from "@/lib/tasks/schedule";
import { LinkifyText } from "@/components/linkify-text";
import type {
  TaskMoveDirection,
  TaskSummary,
  TemplateCoverage,
} from "@/lib/tasks/types";

export function TemplateList({
  tasks,
  coverage,
}: {
  tasks: TaskSummary[];
  coverage?: TemplateCoverage;
}) {
  if (tasks.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có nhiệm vụ nào.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          coverage={coverage?.[task.id]}
          canMoveDown={index < tasks.length - 1}
          canMoveUp={index > 0}
        />
      ))}
    </div>
  );
}

function TaskCard({
  task,
  coverage,
  canMoveUp,
  canMoveDown,
}: {
  task: TaskSummary;
  coverage?: { completed: number; applicable: number };
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleTaskAction(task.id);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDelete() {
    const relatedData =
      task.taskType === "COUNT_TOTAL"
        ? "Tất cả lượt nộp liên quan cũng sẽ bị xoá."
        : "Tất cả lượt nộp và mục tiêu tháng liên quan cũng sẽ bị xoá.";
    const confirmed = window.confirm(
      `Xoá nhiệm vụ "${task.title}"? ${relatedData}`,
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (!result.ok) setError(result.error);
    });
  }

  function handleMove(direction: TaskMoveDirection) {
    setError(null);
    startTransition(async () => {
      const result = await moveTaskAction(task.id, direction);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="glass-card flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold" title={task.title}>
              {task.title}
            </h3>
            {task.description && (
              <p
                className="mt-0.5 truncate text-xs text-muted-foreground"
                title={task.description}
              >
                <LinkifyText text={task.description} />
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
                {SCOPE_LABELS[task.scope]}
              </span>
              <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
                {TASK_TYPE_LABELS[task.taskType]}
              </span>
              {task.taskType === "DAILY_PER_MEMBER" && (
                <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
                  {formatTaskScheduleLabel(task)}
                </span>
              )}
              <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
                {targetsAllRoles(task.targetRoles, task.scope)
                  ? "Tất cả vai trò"
                  : task.targetRoles
                      .map((role) => ROLE_LABELS[role])
                      .join(", ")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.deadlineTime}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {task.expReward} XP
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {task.pointReward} điểm
              </span>
              <span>Nhập bù: {task.lateWindowDays} ngày</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  task.isActive
                    ? "bg-overlay-medium text-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {task.isActive ? "Hoạt động" : "Tắt"}
              </span>
              {coverage && coverage.applicable > 0 && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                  {coverage.completed}/{coverage.applicable} hôm nay
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 self-start">
            <div className="flex flex-col rounded-xl bg-overlay-subtle p-1 ring-1 ring-border">
              <button
                type="button"
                onClick={() => handleMove("up")}
                disabled={isPending || !canMoveUp}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Đưa nhiệm vụ lên trên"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove("down")}
                disabled={isPending || !canMoveDown}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Đưa nhiệm vụ xuống dưới"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              disabled={isPending}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:opacity-50"
              aria-label="Sửa nhiệm vụ"
              aria-pressed={isEditing}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:opacity-50"
              aria-label={task.isActive ? "Tắt nhiệm vụ" : "Bật nhiệm vụ"}
            >
              {task.isActive ? (
                <ToggleRight className="h-5 w-5 text-foreground" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Xoá nhiệm vụ"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-[11px] text-destructive">
            {error}
          </p>
        )}
      </div>
      {isEditing && (
        <EditTemplateForm task={task} onClose={() => setIsEditing(false)} />
      )}
    </div>
  );
}

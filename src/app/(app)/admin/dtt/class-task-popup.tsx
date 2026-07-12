"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Book, BookOpen } from "lucide-react";
import {
  addClassTaskAction,
  removeClassTaskAction,
  createCustomClassTaskAction,
} from "./class-task-actions";
import { FormError, FormSuccess } from "../_shared";
import { TASK_TARGET_ROLES, ROLE_LABELS } from "@/lib/domain";

type TaskSummary = {
  id: string;
  title: string;
  expReward: number;
  pointReward: number;
};

type ClassTaskEntry = {
  taskId: string;
  taskTitle: string;
  isInherited: boolean;
};

export function ClassTaskPopup({
  classId,
  className,
  availableTasks,
  classTasks,
  onClose,
}: {
  classId: string;
  className: string;
  availableTasks: TaskSummary[];
  classTasks: ClassTaskEntry[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inherit" | "custom">("inherit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCustomForm, setShowCustomForm] = useState(false);

  const classTaskIds = new Set(classTasks.map((t) => t.taskId));
  const inheritableTasks = availableTasks.filter(
    (t) => !classTaskIds.has(t.id)
  );

  const handleAddInherited = (taskId: string, taskTitle: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await addClassTaskAction(classId, taskId, true);
      if (res.ok) {
        setSuccess(`Đã thêm nhiệm vụ "${taskTitle}" vào lớp.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleRemove = (taskId: string, taskTitle: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await removeClassTaskAction(classId, taskId);
      if (res.ok) {
        setSuccess(`Đã rút nhiệm vụ "${taskTitle}" khỏi lớp.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleCreateCustom = async (formData: FormData) => {
    setError(null);
    setSuccess(null);
    const result = await createCustomClassTaskAction(classId, formData);
    if (result.ok) {
      setSuccess("Đã tạo nhiệm vụ custom cho lớp.");
      setShowCustomForm(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="glass-card relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden border border-border/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-overlay-subtle/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Nhiệm vụ lớp {className}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {error && <FormError message={error} onDismiss={() => setError(null)} />}
          {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

          {/* Tabs */}
          <div className="mb-4 inline-flex gap-1 rounded-lg border border-border/60 bg-overlay-subtle p-1">
            <button
              type="button"
              onClick={() => setActiveTab("inherit")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "inherit"
                  ? "bg-background text-foreground ring-1 ring-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kế thừa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "custom"
                  ? "bg-background text-foreground ring-1 ring-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Inherit tab */}
          {activeTab === "inherit" && (
            <div className="space-y-3">
              {/* Class tasks list */}
              {classTasks.filter(t => t.isInherited).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Đang thuộc lớp
                  </h3>
                  <div className="space-y-1.5">
                    {classTasks.filter(t => t.isInherited).map((task) => (
                      <div
                        key={task.taskId}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                          <p className="text-[11px] text-muted-foreground">Kế thừa từ task chung</p>
                        </div>
                        <button
                          onClick={() => handleRemove(task.taskId, task.taskTitle)}
                          disabled={isPending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Rút
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available tasks */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nhiệm vụ có sẵn
                </h3>
                {inheritableTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 py-4 text-center">
                    Không còn nhiệm vụ nào để thêm
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {inheritableTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {task.expReward} EXP · {task.pointReward} điểm
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddInherited(task.id, task.title)}
                          disabled={isPending}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom tab */}
          {activeTab === "custom" && (
            <div className="space-y-3">
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="btn-primary-gradient flex h-10 w-full items-center justify-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tạo nhiệm vụ mới cho lớp
                </button>
              ) : (
                <form
                  action={handleCreateCustom}
                  className="space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Tạo nhiệm vụ custom
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Nhiệm vụ custom chỉ thưởng EXP, không thưởng point.
                  </p>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Tên nhiệm vụ
                    </span>
                    <input
                      name="title"
                      required
                      minLength={3}
                      maxLength={80}
                      placeholder="VD: Đọc kinh Sáng"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Mô tả</span>
                    <textarea
                      name="description"
                      maxLength={280}
                      className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Hạn hoàn thành
                      </span>
                      <input
                        name="deadlineTime"
                        type="time"
                        defaultValue="20:00"
                        required
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        EXP thưởng
                      </span>
                      <input
                        name="expReward"
                        type="number"
                        min={0}
                        defaultValue={10}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </label>
                  </div>

                  {/* No pointReward field — always 0 */}

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Vai trò áp dụng
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {TASK_TARGET_ROLES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            name="targetRoles"
                            value={role}
                            defaultChecked
                          />
                          {ROLE_LABELS[role]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn-primary-gradient flex h-10 flex-1 items-center justify-center text-sm disabled:opacity-50"
                    >
                      Tạo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="btn-secondary-gradient flex h-10 items-center px-4 text-sm"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Custom tasks list */}
              {classTasks.filter(t => !t.isInherited).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nhiệm vụ custom của lớp
                  </h3>
                  <div className="space-y-1.5">
                    {classTasks.filter(t => !t.isInherited).map((task) => (
                      <div
                        key={task.taskId}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Chỉ EXP
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(task.taskId, task.taskTitle)}
                          disabled={isPending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

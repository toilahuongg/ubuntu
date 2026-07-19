"use client";

import Link from "next/link";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";
import type { DailyCampaignAdminView } from "@/lib/campaigns/campaign-service";
import { ROLE_LABELS } from "@/lib/domain";
import type { TaskSummary } from "@/lib/tasks/types";

import {
  deleteCampaignOnlyTaskAction,
  saveDailyCampaignAction,
  updateCampaignOnlyTaskAction,
} from "./actions";

type CampaignTaskTab = "common" | "custom";

export function CampaignTaskSelector({
  data,
}: {
  data: DailyCampaignAdminView;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(data.selectedTaskIds));
  const [activeTab, setActiveTab] = useState<CampaignTaskTab>(
    data.eligibleTasks.length > 0 ? "common" : "custom",
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(taskId: string) {
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function updateCustomTask(taskId: string, formData: FormData) {
    formData.set("taskId", taskId);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateCampaignOnlyTaskAction(formData);
      if (result.ok) {
        setMessage("Đã cập nhật nhiệm vụ custom.");
        setEditingTaskId(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function deleteCustomTask(task: TaskSummary) {
    const confirmed = window.confirm(
      `Xoá nhiệm vụ custom "${task.title}"? Tất cả lượt nộp liên quan cũng sẽ bị xoá.`,
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteCampaignOnlyTaskAction(task.id);
      if (result.ok) {
        setSelected((current) => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
        if (editingTaskId === task.id) setEditingTaskId(null);
        setMessage("Đã xoá nhiệm vụ custom.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function saveCampaign() {
    const formData = new FormData();
    formData.set("date", data.date);
    for (const taskId of selected) {
      formData.append("taskIds", taskId);
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveDailyCampaignAction(formData);
      if (result.ok) {
        setMessage("Đã lưu chiến dịch hôm nay.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{data.date}</p>
        {activeTab === "custom" && (
          <Link
            href="/admin/campaigns/tasks/new"
            className="btn-secondary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            Task mới
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm font-medium text-primary" role="status">
          {message}
        </p>
      )}

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("common")}
          className={`h-10 cursor-pointer border-b-2 px-3 text-sm font-medium transition-colors ${
            activeTab === "common"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Nhiệm vụ chung ({data.eligibleTasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`h-10 cursor-pointer border-b-2 px-3 text-sm font-medium transition-colors ${
            activeTab === "custom"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Nhiệm vụ custom ({data.campaignOnlyTasks.length})
        </button>
      </div>

      {activeTab === "common" ? (
        <TaskChoiceList
          emptyText="Chưa có nhiệm vụ chung phù hợp cho chiến dịch hôm nay."
          selected={selected}
          tasks={data.eligibleTasks}
          onToggle={toggle}
        />
      ) : (
        <div className="grid gap-2">
          {data.campaignOnlyTasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className="mt-1"
                  aria-label={`Chọn ${task.title}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.expReward} EXP · {task.pointReward} điểm ·{" "}
                    {task.deadlineTime}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTaskId((current) =>
                        current === task.id ? null : task.id,
                      )
                    }
                    disabled={isPending}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:opacity-50"
                    aria-label="Sửa nhiệm vụ custom"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCustomTask(task)}
                    disabled={isPending}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label="Xoá nhiệm vụ custom"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {editingTaskId === task.id && (
                <CampaignCustomTaskEditForm
                  isPending={isPending}
                  task={task}
                  onCancel={() => setEditingTaskId(null)}
                  onSubmit={(formData) => updateCustomTask(task.id, formData)}
                />
              )}
            </div>
          ))}
          {data.campaignOnlyTasks.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Chưa có nhiệm vụ custom nào.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Đã chọn {selected.size} nhiệm vụ cho chiến dịch hôm nay.
        </p>
        <button
          type="button"
          onClick={saveCampaign}
          disabled={isPending || selected.size === 0}
          className="btn-primary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Lưu chiến dịch hôm nay
        </button>
      </div>
    </div>
  );
}

function TaskChoiceList({
  emptyText,
  selected,
  tasks,
  onToggle,
}: {
  emptyText: string;
  selected: Set<string>;
  tasks: TaskSummary[];
  onToggle: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {tasks.map((task) => (
        <label
          key={task.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-overlay-subtle"
        >
          <input
            type="checkbox"
            checked={selected.has(task.id)}
            onChange={() => onToggle(task.id)}
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{task.title}</span>
            <span className="block text-xs text-muted-foreground">
              {task.expReward} EXP · {task.pointReward} điểm ·{" "}
              {task.deadlineTime}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function CampaignCustomTaskEditForm({
  isPending,
  task,
  onCancel,
  onSubmit,
}: {
  isPending: boolean;
  task: TaskSummary;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-lg border border-border bg-overlay-subtle p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Sửa nhiệm vụ custom</h3>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
          aria-label="Đóng form sửa"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Tên nhiệm vụ
        </span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={80}
          defaultValue={task.title}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Mô tả</span>
        <textarea
          name="description"
          maxLength={280}
          defaultValue={task.description}
          className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Hạn
          </span>
          <input
            name="deadlineTime"
            type="time"
            defaultValue={task.deadlineTime}
            required
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            EXP
          </span>
          <input
            name="expReward"
            type="number"
            min={0}
            defaultValue={task.expReward}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Điểm
          </span>
          <input
            name="pointReward"
            type="number"
            min={0}
            defaultValue={task.pointReward}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Nhập bù
          </span>
          <input
            name="lateWindowDays"
            type="number"
            min={1}
            defaultValue={task.lateWindowDays}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Vai trò áp dụng
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CAMPAIGN_TARGET_ROLES.map((role) => (
            <label
              key={role}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
            >
              <input
                type="checkbox"
                name="targetRoles"
                value={role}
                defaultChecked={task.targetRoles.includes(role)}
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Tin nhắn sau khi nộp
        </span>
        <textarea
          name="submissionMessage"
          maxLength={280}
          defaultValue={task.submissionMessage}
          className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </label>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary-gradient h-10 px-4 text-sm"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary-gradient h-10 px-4 text-sm disabled:opacity-50"
        >
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
}

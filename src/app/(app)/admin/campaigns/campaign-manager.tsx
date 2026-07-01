"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Save } from "lucide-react";

import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";
import type { DailyCampaignAdminView } from "@/lib/campaigns/campaign-service";
import { ROLE_LABELS } from "@/lib/domain";
import {
  createCampaignOnlyTaskAction,
  saveDailyCampaignAction,
} from "./actions";

export function CampaignManager({ data }: { data: DailyCampaignAdminView }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(data.selectedTaskIds));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tasks = useMemo(
    () => [...data.eligibleTasks, ...data.campaignOnlyTasks],
    [data.eligibleTasks, data.campaignOnlyTasks],
  );

  function toggle(taskId: string) {
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

  function saveCampaign() {
    const formData = new FormData();
    formData.set("date", data.date);
    for (const taskId of selected) {
      formData.append("taskIds", taskId);
    }
    setError(null);
    startTransition(async () => {
      const result = await saveDailyCampaignAction(formData);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function createSpecialTask(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCampaignOnlyTaskAction(formData);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Chiến dịch ngày
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {data.date}
          </p>
        </div>
        <button
          type="button"
          onClick={saveCampaign}
          disabled={isPending || selected.size === 0}
          className="btn-primary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Lưu
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Nhiệm vụ chọn vào chiến dịch</h2>
        <div className="grid gap-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(task.id)}
                onChange={() => toggle(task.id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{task.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {task.campaignOnly
                    ? "Nhiệm vụ riêng chiến dịch"
                    : "Nhiệm vụ có sẵn"}{" "}
                  · {task.expReward} EXP · {task.pointReward} điểm
                </span>
              </span>
            </label>
          ))}
          {tasks.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Chưa có nhiệm vụ phù hợp cho chiến dịch hôm nay.
            </div>
          )}
        </div>
      </section>

      {data.report.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Kết quả chiến dịch</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            {data.report.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.completed}/{row.total} nhiệm vụ
                  </p>
                </div>
                <span
                  className={
                    row.isComplete
                      ? "text-xs font-semibold text-primary"
                      : "text-xs font-semibold text-muted-foreground"
                  }
                >
                  {row.isComplete ? "Hoàn thành" : "Đang làm"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <form
        action={createSpecialTask}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Tạo nhiệm vụ riêng
        </h2>
        <input
          name="title"
          required
          minLength={3}
          maxLength={80}
          placeholder="Tên nhiệm vụ"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <textarea
          name="description"
          maxLength={280}
          placeholder="Mô tả"
          className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            name="deadlineTime"
            type="time"
            defaultValue="20:00"
            required
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            name="expReward"
            type="number"
            min={0}
            defaultValue={10}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            name="pointReward"
            type="number"
            min={0}
            defaultValue={10}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAMPAIGN_TARGET_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
            >
              <input type="checkbox" name="targetRoles" value={role} defaultChecked />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-secondary-gradient h-10 px-4 text-sm disabled:opacity-50"
        >
          Tạo nhiệm vụ
        </button>
      </form>
    </div>
  );
}

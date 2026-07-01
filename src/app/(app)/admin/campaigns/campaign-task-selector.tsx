"use client";

import Link from "next/link";
import { Plus, Save } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { DailyCampaignAdminView } from "@/lib/campaigns/campaign-service";

import { saveDailyCampaignAction } from "./actions";

export function CampaignTaskSelector({
  data,
}: {
  data: DailyCampaignAdminView;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(data.selectedTaskIds));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tasks = useMemo(
    () => [...data.eligibleTasks, ...data.campaignOnlyTasks],
    [data.eligibleTasks, data.campaignOnlyTasks],
  );

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
        <Link
          href="/admin/campaigns/tasks/new"
          className="btn-secondary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm"
        >
          <Plus className="h-4 w-4" />
          Task mới
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm font-medium text-primary" role="status">
          {message}
        </p>
      )}

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
  );
}

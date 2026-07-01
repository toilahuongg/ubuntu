"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";
import { ROLE_LABELS } from "@/lib/domain";

import { createCampaignOnlyTaskAction } from "./actions";

export function CampaignTaskForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createSpecialTask(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCampaignOnlyTaskAction(formData);
      if (result.ok) {
        router.push("/admin/campaigns/tasks");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      action={createSpecialTask}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Tạo nhiệm vụ riêng
        </h2>
        <p className="text-xs leading-5 text-muted-foreground">
          Nhiệm vụ riêng chỉ hiện khi được chọn vào chiến dịch ngày. Có thể tái
          sử dụng cho các ngày sau.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Tên nhiệm vụ
        </span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={80}
          placeholder="VD: Gọi chăm sóc 3 khách hàng"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Mô tả</span>
        <textarea
          name="description"
          maxLength={280}
          placeholder="Hướng dẫn chi tiết người làm cần hoàn thành"
          className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
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
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Điểm thưởng
          </span>
          <input
            name="pointReward"
            type="number"
            min={0}
            defaultValue={10}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Vai trò áp dụng
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAMPAIGN_TARGET_ROLES.map((role) => (
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
      <p className="text-xs leading-5 text-muted-foreground">
        Sau khi tạo, chọn nhiệm vụ ở danh sách bên trên và bấm Lưu để áp dụng
        cho hôm nay.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="btn-secondary-gradient h-10 px-4 text-sm disabled:opacity-50"
      >
        Tạo vào kho nhiệm vụ riêng
      </button>
    </form>
  );
}

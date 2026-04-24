"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserPlus, X } from "lucide-react";
import Link from "next/link";

import {
  createCustomerAction,
  updateCustomerAction,
} from "@/app/(app)/customers/actions";
import type {
  AgeBracket,
  HeartStatus,
  Occupation,
  Personality,
} from "@/lib/customer/constants";
import {
  AGE_BRACKETS,
  AGE_BRACKET_LABELS,
  HEART_STATUSES,
  HEART_STATUS_LABELS,
  OCCUPATIONS,
  OCCUPATION_LABELS,
  PERSONALITIES,
  PERSONALITY_LABELS,
} from "@/lib/customer/constants";
import type {
  CustomerCaregiverOption,
  CustomerListItem,
} from "@/lib/services/customer-service";

export function CustomerForm({
  caregiverOptions = [],
  currentUserId,
  initialData,
}: {
  caregiverOptions?: CustomerCaregiverOption[];
  currentUserId?: string;
  initialData?: CustomerListItem;
}) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [ageBracket, setAgeBracket] = useState(initialData?.ageBracket ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "male");
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [personality, setPersonality] = useState(initialData?.personality ?? "");
  const [heartStatus, setHeartStatus] = useState(initialData?.heartStatus ?? "LEARN_MORE");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [caregiverIds, setCaregiverIds] = useState<string[]>(
    initialData?.caregiverIds ??
      (currentUserId && caregiverOptions.some((user) => user.id === currentUserId)
        ? [currentUserId]
        : []),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addCaregiver(id: string) {
    if (!id || caregiverIds.includes(id) || caregiverIds.length >= 3) return;
    setCaregiverIds([...caregiverIds, id]);
  }

  function removeCaregiver(id: string) {
    setCaregiverIds(caregiverIds.filter((caregiverId) => caregiverId !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (isEdit && initialData) {
      formData.append("customerId", initialData.id);
    }
    formData.append("name", name);
    formData.append("ageBracket", ageBracket);
    formData.append("gender", gender);
    formData.append("occupation", occupation);
    formData.append("personality", personality);
    formData.append("heartStatus", heartStatus);
    formData.append("notes", notes);
    for (const caregiverId of caregiverIds) {
      formData.append("caregiverIds", caregiverId);
    }

    const action = isEdit ? updateCustomerAction : createCustomerAction;
    const result = await action(formData);

    if (result.ok) {
      if (!isEdit && result.data) {
        router.push(`/customers/${(result.data as { id: string }).id}`);
      } else {
        router.push(`/customers/${initialData?.id}`);
      }
      router.refresh();
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Tên <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Tên khách hàng"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Độ tuổi <span className="text-red-500">*</span>
          </label>
          <select
            value={ageBracket}
            onChange={(e) => setAgeBracket(e.target.value as AgeBracket)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Chọn độ tuổi</option>
            {AGE_BRACKETS.map((b) => (
              <option key={b} value={b}>
                {AGE_BRACKET_LABELS[b]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Giới tính <span className="text-red-500">*</span>
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female")}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Công việc <span className="text-red-500">*</span>
          </label>
          <select
            value={occupation}
            onChange={(e) => setOccupation(e.target.value as Occupation)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Chọn công việc</option>
            {OCCUPATIONS.map((o) => (
              <option key={o} value={o}>
                {OCCUPATION_LABELS[o]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Tính cách <span className="text-red-500">*</span>
          </label>
          <select
            value={personality}
            onChange={(e) => setPersonality(e.target.value as Personality)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Chọn tính cách</option>
            {PERSONALITIES.map((p) => (
              <option key={p} value={p}>
                {PERSONALITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Tấm lòng
        </label>
        <select
          value={heartStatus}
          onChange={(e) => setHeartStatus(e.target.value as HeartStatus)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          {HEART_STATUSES.map((s) => (
            <option key={s} value={s}>
              {HEART_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Ghi chú
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Thông tin bổ sung..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {caregiverOptions.length > 0 && (
        <div className="space-y-2 rounded-lg bg-overlay-subtle p-3 ring-1 ring-border">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              Người chăm sóc
            </label>
            <span className="text-[11px] text-muted-foreground">
              {caregiverIds.length}/3
            </span>
          </div>

          {caregiverIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caregiverIds.map((id) => {
                const caregiver = caregiverOptions.find((user) => user.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-medium ring-1 ring-border"
                  >
                    {caregiver?.fullName ?? "Người dùng"}
                    <button
                      type="button"
                      disabled={caregiverIds.length <= 1}
                      onClick={() => removeCaregiver(id)}
                      className="rounded-full p-0.5 text-muted-foreground transition hover:bg-overlay-medium hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Bỏ người chăm sóc"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <select
            value=""
            disabled={caregiverIds.length >= 3}
            onChange={(e) => addCaregiver(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            <option value="">
              {caregiverIds.length >= 3
                ? "Đã đủ 3 người chăm sóc"
                : "Thêm người cùng chăm sóc"}
            </option>
            {caregiverOptions
              .filter((user) => !caregiverIds.includes(user.id))
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} · {user.roleLabel}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Link
          href={isEdit ? `/customers/${initialData?.id}` : "/customers"}
          className="inline-flex items-center gap-1 rounded-xl bg-overlay-subtle px-4 py-2.5 text-xs font-semibold ring-1 ring-border transition hover:bg-overlay-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Huỷ
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSubmitting
            ? "Đang lưu..."
            : isEdit
              ? "Cập nhật"
              : "Tạo khách hàng"}
        </button>
      </div>
    </form>
  );
}

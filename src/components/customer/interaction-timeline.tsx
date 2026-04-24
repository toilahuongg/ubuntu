"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  MessageSquare,
  Pencil,
  Phone,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteInteractionAction,
  updateInteractionAction,
} from "@/app/(app)/customers/actions";
import {
  INTERACTION_OUTCOME_LABELS,
  INTERACTION_OUTCOMES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  ONE_TIME_INTERACTION_OUTCOMES,
  SHARED_CONTENT_LABELS,
  SHARED_CONTENTS,
} from "@/lib/customer/constants";
import type {
  InteractionOutcome,
  InteractionType,
  SharedContent,
} from "@/lib/customer/constants";
import type { InteractionListItem } from "@/lib/services/customer-interaction-service";
import type { CustomerCaregiverOption } from "@/lib/services/customer-service";

function getOutcomeClass(outcome: InteractionOutcome) {
  if (outcome === "BAPTIZED") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (outcome === "EFFECTIVE") return "bg-sky-100 text-sky-700 ring-sky-200";
  if (outcome === "SIMPLE") return "bg-blue-100 text-blue-700 ring-blue-200";
  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function getOutcomeIconClass(outcome: InteractionOutcome) {
  if (outcome === "BAPTIZED") return "bg-emerald-100 text-emerald-700";
  if (outcome === "EFFECTIVE") return "bg-sky-100 text-sky-700";
  if (outcome === "SIMPLE") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function InteractionIcon({ type }: { type: InteractionType }) {
  if (type === "MESSAGE") return <MessageSquare className="h-4 w-4" />;
  if (type === "CALL") return <Phone className="h-4 w-4" />;
  return <Share2 className="h-4 w-4" />;
}

function toDateInputValue(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function InteractionTimeline({
  caregiverOptions = [],
  customerId,
  interactions,
}: {
  caregiverOptions?: CustomerCaregiverOption[];
  customerId: string;
  interactions: InteractionListItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    caregiverId: string;
    date: string;
    notes: string;
    outcome: InteractionOutcome;
    sharedContent: SharedContent | "";
    type: InteractionType;
  } | null>(null);

  function startEdit(interaction: InteractionListItem) {
    setError(null);
    setEditingId(interaction.id);
    setDraft({
      caregiverId: interaction.caregiverId,
      date: toDateInputValue(interaction.date),
      notes: interaction.notes,
      outcome: interaction.outcome,
      sharedContent: interaction.sharedContent ?? "",
      type: interaction.type,
    });
  }

  async function submitEdit(interactionId: string) {
    if (!draft) return;

    setSavingId(interactionId);
    setError(null);
    const formData = new FormData();
    formData.append("interactionId", interactionId);
    formData.append("customerId", customerId);
    formData.append("date", draft.date);
    formData.append("type", draft.type);
    formData.append("outcome", draft.outcome);
    formData.append("notes", draft.notes);
    if (draft.type === "SHARE_CONTENT" && draft.sharedContent) {
      formData.append("sharedContent", draft.sharedContent);
    }
    if (draft.type === "SHARE_CONTENT" && draft.caregiverId) {
      formData.append("caregiverId", draft.caregiverId);
    }

    const result = await updateInteractionAction(formData);
    if (result.ok) {
      setEditingId(null);
      setDraft(null);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSavingId(null);
  }

  async function deleteInteraction(interactionId: string) {
    const confirmed = window.confirm("Xoá tương tác này?");
    if (!confirmed) return;

    setDeletingId(interactionId);
    setError(null);
    const result = await deleteInteractionAction(interactionId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setDeletingId(null);
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Lịch sử tương tác ({interactions.length})
      </h2>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {interactions.length > 0 ? (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const isEditing = editingId === interaction.id && draft;
            const interactionCaregiverOptions = caregiverOptions.some(
              (caregiver) => caregiver.id === interaction.caregiverId,
            )
              ? caregiverOptions
              : [
                  ...caregiverOptions,
                  {
                    fullName: interaction.caregiverName,
                    id: interaction.caregiverId,
                    roleLabel: "Đã ghi",
                  },
                ];
            return (
              <div key={interaction.id} className="glass-card flex items-start gap-3 p-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getOutcomeIconClass(interaction.outcome)}`}
                >
                  <InteractionIcon type={interaction.type} />
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) =>
                            setDraft({ ...draft, date: e.target.value })
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <select
                          value={draft.type}
                          onChange={(e) => {
                            const nextType = e.target.value as InteractionType;
                            const nextCaregiverId =
                              nextType === "SHARE_CONTENT" &&
                              !caregiverOptions.some(
                                (caregiver) => caregiver.id === draft.caregiverId,
                              )
                                ? (caregiverOptions[0]?.id ?? "")
                                : draft.caregiverId;
                            setDraft({
                              ...draft,
                              caregiverId: nextCaregiverId,
                              sharedContent:
                                nextType === "SHARE_CONTENT"
                                  ? draft.sharedContent
                                  : "",
                              type: nextType,
                            });
                          }}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          {INTERACTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {INTERACTION_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      {draft.type === "SHARE_CONTENT" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={draft.sharedContent}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                sharedContent: e.target.value as SharedContent,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="">-- Chọn nội dung --</option>
                            {SHARED_CONTENTS.map((content) => (
                              <option key={content} value={content}>
                                {SHARED_CONTENT_LABELS[content]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={draft.caregiverId}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                caregiverId: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="">-- Chọn người chia sẻ --</option>
                            {interactionCaregiverOptions.map((caregiver) => (
                              <option key={caregiver.id} value={caregiver.id}>
                                {caregiver.fullName} · {caregiver.roleLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {INTERACTION_OUTCOMES.map((outcome) => {
                          const usedByAnotherInteraction =
                            ONE_TIME_INTERACTION_OUTCOMES.includes(
                              outcome as (typeof ONE_TIME_INTERACTION_OUTCOMES)[number],
                            ) &&
                            outcome !== interaction.outcome &&
                            interactions.some((item) => item.outcome === outcome);
                          return (
                            <button
                              key={outcome}
                              type="button"
                              disabled={usedByAnotherInteraction}
                              onClick={() => setDraft({ ...draft, outcome })}
                              className={`rounded-lg px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                draft.outcome === outcome
                                  ? getOutcomeClass(outcome)
                                  : "bg-overlay-subtle text-muted-foreground ring-1 ring-border hover:text-foreground"
                              }`}
                            >
                              {INTERACTION_OUTCOME_LABELS[outcome]}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={draft.notes}
                        onChange={(e) =>
                          setDraft({ ...draft, notes: e.target.value })
                        }
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
                        placeholder="Ghi chú..."
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={savingId === interaction.id}
                          onClick={() => submitEdit(interaction.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-overlay-subtle px-2.5 py-1.5 text-xs font-medium ring-1 ring-border transition hover:bg-overlay-medium"
                        >
                          <X className="h-3.5 w-3.5" />
                          Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-xs font-medium">
                            {INTERACTION_TYPE_LABELS[interaction.type]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(interaction.date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(interaction)}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-overlay-subtle hover:text-foreground"
                            aria-label="Sửa tương tác"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === interaction.id}
                            onClick={() => deleteInteraction(interaction.id)}
                            className="rounded-md p-1 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            aria-label="Xoá tương tác"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${getOutcomeClass(interaction.outcome)}`}
                        >
                          {INTERACTION_OUTCOME_LABELS[interaction.outcome]}
                        </span>
                        {interaction.sharedContent && (
                          <span className="inline-flex items-center rounded-full bg-overlay-subtle px-2 py-0.5 text-[10px] font-medium ring-1 ring-border">
                            {SHARED_CONTENT_LABELS[interaction.sharedContent]} ·{" "}
                            {interaction.caregiverName}
                          </span>
                        )}
                        {(interaction.pointsAwarded > 0 ||
                          interaction.expAwarded > 0) && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            +{interaction.pointsAwarded}đ / +{interaction.expAwarded}EXP
                          </span>
                        )}
                      </div>
                      {interaction.notes && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {interaction.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center px-5 py-10 text-center">
          <Calendar className="mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm font-medium">Chưa có tương tác nào.</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Ghi nhận lần chăm sóc đầu tiên để theo dõi tiến trình.
          </p>
        </div>
      )}
    </section>
  );
}

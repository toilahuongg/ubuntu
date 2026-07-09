"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Phone, Share2, Send } from "lucide-react";

import { createInteractionAction } from "@/app/(app)/customers/actions";
import {
  INTERACTION_OUTCOME_LABELS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  INTERACTION_OUTCOMES,
  ONE_TIME_INTERACTION_OUTCOMES,
  SHARED_CONTENTS,
  SHARED_CONTENT_LABELS,
} from "@/lib/customer/constants";
import { calculateInteractionScore } from "@/lib/customer/scoring";
import type { InteractionOutcome } from "@/lib/customer/constants";
import type { CustomerCaregiverOption } from "@/lib/services/customer-service";
import { UserCombobox } from "@/components/user-combobox";

function getDefaultCaregiverId(
  caregiverOptions: CustomerCaregiverOption[],
  currentUserId?: string,
) {
  if (currentUserId && caregiverOptions.some((user) => user.id === currentUserId)) {
    return currentUserId;
  }
  return caregiverOptions[0]?.id ?? "";
}

export function InteractionForm({
  caregiverOptions = [],
  customerId,
  currentUserId,
  usedOutcomes = [],
}: {
  caregiverOptions?: CustomerCaregiverOption[];
  customerId: string;
  currentUserId?: string;
  usedOutcomes?: InteractionOutcome[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("MESSAGE");
  const [outcome, setOutcome] = useState("NONE");
  const [sharedContent, setSharedContent] = useState<string>("");
  const [sharedByCaregiverId, setSharedByCaregiverId] = useState(() =>
    getDefaultCaregiverId(caregiverOptions, currentUserId),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const previewPoints = calculateInteractionScore(outcome as InteractionOutcome);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("customerId", customerId);
    formData.append("type", type);
    formData.append("outcome", outcome);
    if (type === "SHARE_CONTENT") {
      if (sharedContent) formData.append("sharedContent", sharedContent);
      if (sharedByCaregiverId) {
        formData.append("caregiverId", sharedByCaregiverId);
      }
    }
    formData.append("notes", notes);

    const result = await createInteractionAction(formData);
    if (result.ok) {
      setType("MESSAGE");
      setOutcome("NONE");
      setSharedContent("");
      setSharedByCaregiverId(getDefaultCaregiverId(caregiverOptions, currentUserId));
      setNotes("");
      router.refresh();
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <section className="glass-card space-y-3 p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Ghi tương tác
      </h2>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Type */}
        <div className="grid grid-cols-3 gap-2">
          {INTERACTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                if (t === "SHARE_CONTENT" && !sharedByCaregiverId) {
                  setSharedByCaregiverId(
                    getDefaultCaregiverId(caregiverOptions, currentUserId),
                  );
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                type === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-overlay-subtle text-muted-foreground ring-1 ring-border hover:text-foreground"
              }`}
            >
              {t === "MESSAGE" ? (
                <MessageSquare className="h-3.5 w-3.5" />
              ) : t === "CALL" ? (
                <Phone className="h-3.5 w-3.5" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {INTERACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Shared content (only for SHARE_CONTENT) */}
        {type === "SHARE_CONTENT" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Nội dung chia sẻ
              </label>
              <select
                value={sharedContent}
                onChange={(e) => setSharedContent(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                required
              >
                <option value="">-- Chọn nội dung --</option>
                {SHARED_CONTENTS.map((c) => (
                  <option key={c} value={c}>
                    {SHARED_CONTENT_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Người chia sẻ
              </label>
              <UserCombobox
                value={sharedByCaregiverId}
                onChange={(v) => setSharedByCaregiverId(v as string)}
                placeholder="Tìm người chia sẻ…"
                selectedOptions={
                  sharedByCaregiverId
                    ? caregiverOptions.filter((c) => c.id === sharedByCaregiverId)
                    : []
                }
              />
            </div>
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Tình trạng
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INTERACTION_OUTCOMES.map((o) => {
              const alreadyUsed =
                ONE_TIME_INTERACTION_OUTCOMES.includes(
                  o as (typeof ONE_TIME_INTERACTION_OUTCOMES)[number],
                ) && usedOutcomes.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  disabled={alreadyUsed}
                  onClick={() => setOutcome(o)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    outcome === o
                      ? o === "BAPTIZED"
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        : o === "EFFECTIVE"
                          ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                          : o === "SIMPLE"
                            ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                            : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                      : "bg-overlay-subtle text-muted-foreground ring-1 ring-border hover:text-foreground"
                  }`}
                >
                  {INTERACTION_OUTCOME_LABELS[o]}
                  {alreadyUsed ? " · Đã ghi" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        {previewPoints.points > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
            <span className="font-semibold">Thưởng dự kiến:</span>
            <span>+{previewPoints.points}đ · +{previewPoints.exp}EXP</span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Ghi chú
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ghi chú thêm về tương tác..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting ? "Đang lưu..." : "Ghi nhận tương tác"}
        </button>
      </form>
    </section>
  );
}

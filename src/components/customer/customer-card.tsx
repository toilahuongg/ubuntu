import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import type { CustomerListItem } from "@/lib/services/customer-service";
import { HeartStatusBadge } from "./heart-status-badge";
import {
  AGE_BRACKET_LABELS,
  INTERACTION_OUTCOME_LABELS,
  type InteractionOutcome,
  OCCUPATION_LABELS,
  PERSONALITY_LABELS,
} from "@/lib/customer/constants";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getOutcomeClass(outcome: InteractionOutcome) {
  if (outcome === "BAPTIZED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (outcome === "EFFECTIVE") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (outcome === "SIMPLE") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-overlay-subtle text-muted-foreground ring-border";
}

export function CustomerCard({ customer }: { customer: CustomerListItem }) {
  const daysSinceLastInteraction = customer.lastInteractionAt
    ? Math.floor(
        (new Date().getTime() - new Date(customer.lastInteractionAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const caregiverNames =
    customer.caregivers.length > 0
      ? customer.caregivers.map((caregiver) => caregiver.fullName).join(", ")
      : "Chưa phân công";

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="glass-card block space-y-2.5 p-4 transition hover:bg-overlay-subtle"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-semibold">
            {customer.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {AGE_BRACKET_LABELS[customer.ageBracket]} ·{" "}
            {customer.gender === "male" ? "Nam" : "Nữ"} ·{" "}
            {OCCUPATION_LABELS[customer.occupation]}
          </p>
        </div>
        <HeartStatusBadge status={customer.heartStatus} />
      </div>

      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-start gap-1.5 rounded-lg bg-overlay-subtle px-2 py-1.5 ring-1 ring-border">
          <Users className="mt-0.5 h-3 w-3 shrink-0" />
          <p className="min-w-0 leading-relaxed">
            <span className="font-medium text-foreground">Người chăm sóc: </span>
            {caregiverNames}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {daysSinceLastInteraction !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-border ${
              daysSinceLastInteraction >= 3
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-overlay-subtle"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {daysSinceLastInteraction === 0
              ? "Hôm nay"
              : daysSinceLastInteraction === 1
                ? "Hôm qua"
                : `${daysSinceLastInteraction} ngày trước`}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-overlay-subtle px-2 py-0.5 ring-1 ring-border">
          <Calendar className="h-3 w-3" />
          Tương tác cuối:{" "}
          {customer.lastInteractionAt
            ? formatDate(customer.lastInteractionAt)
            : "Chưa có"}
        </span>
        {customer.lastInteractionOutcome && customer.lastInteractionOutcome !== "NONE" && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1 ${getOutcomeClass(
              customer.lastInteractionOutcome,
            )}`}
          >
            {INTERACTION_OUTCOME_LABELS[customer.lastInteractionOutcome]}
          </span>
        )}
        {customer.isBaptized && customer.lastInteractionOutcome !== "BAPTIZED" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            Đã BT
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tính cách: {PERSONALITY_LABELS[customer.personality]}
      </p>
    </Link>
  );
}

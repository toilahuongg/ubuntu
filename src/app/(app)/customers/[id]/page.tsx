import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Edit, Users } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import {
  getCustomerById,
  listAssignableCustomerCaregivers,
} from "@/lib/services/customer-service";
import { listInteractionsByCustomer } from "@/lib/services/customer-interaction-service";
import { canManageCustomer } from "@/lib/permissions";
import { HeartStatusBadge } from "@/components/customer/heart-status-badge";
import { InteractionForm } from "@/components/customer/interaction-form";
import { CustomerDeleteButton } from "@/components/customer/customer-delete-button";
import { InteractionTimeline } from "@/components/customer/interaction-timeline";
import {
  AGE_BRACKET_LABELS,
  ONE_TIME_INTERACTION_OUTCOMES,
  OCCUPATION_LABELS,
  PERSONALITY_LABELS,
} from "@/lib/customer/constants";
import type { InteractionOutcome } from "@/lib/customer/constants";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [customer, interactions, shareUserOptions] = await Promise.all([
    getCustomerById(id, session),
    listInteractionsByCustomer(id, session),
    listAssignableCustomerCaregivers(session),
  ]);

  const canEdit = canManageCustomer(session, customer);
  const usedOneTimeOutcomes = ONE_TIME_INTERACTION_OUTCOMES.filter((outcome) =>
    interactions.some((interaction) => interaction.outcome === outcome),
  ) as InteractionOutcome[];

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <div className="flex items-center gap-2">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-overlay-subtle"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại
        </Link>
      </div>

      {/* Profile Card */}
      <section className="glass-card space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold tracking-tight">
              {customer.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <HeartStatusBadge status={customer.heartStatus} />
              {customer.isBaptized && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Đã BT
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-start gap-2">
              <Link
                href={`/customers/${id}/edit`}
                className="inline-flex items-center gap-1 rounded-lg bg-overlay-subtle px-2.5 py-1.5 text-xs font-medium ring-1 ring-border transition hover:bg-overlay-medium"
              >
                <Edit className="h-3.5 w-3.5" />
                Sửa
              </Link>
              <CustomerDeleteButton customerId={id} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">Độ tuổi</span>
            <p className="font-medium">{AGE_BRACKET_LABELS[customer.ageBracket]}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Giới tính</span>
            <p className="font-medium">{customer.gender === "male" ? "Nam" : "Nữ"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Công việc</span>
            <p className="font-medium">{OCCUPATION_LABELS[customer.occupation]}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Tính cách</span>
            <p className="font-medium">{PERSONALITY_LABELS[customer.personality]}</p>
          </div>
        </div>

        <div className="rounded-lg bg-overlay-subtle p-3 text-xs ring-1 ring-border">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>Người chăm sóc</span>
          </div>
          {customer.caregivers.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customer.caregivers.map((caregiver) => (
                <span
                  key={caregiver.id}
                  className="inline-flex items-center rounded-full bg-background px-2 py-1 text-[11px] font-medium ring-1 ring-border"
                >
                  {caregiver.fullName} · {caregiver.roleLabel}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 font-medium">Chưa phân công</p>
          )}
        </div>

        {customer.notes && (
          <div className="rounded-lg bg-overlay-subtle p-3 text-xs ring-1 ring-border">
            <p className="text-muted-foreground">Ghi chú</p>
            <p className="mt-1 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </section>

      {/* Interaction Form */}
      <InteractionForm
        caregiverOptions={shareUserOptions}
        customerId={id}
        currentUserId={session.id}
        usedOutcomes={usedOneTimeOutcomes}
      />

      <InteractionTimeline
        caregiverOptions={shareUserOptions}
        customerId={id}
        interactions={interactions}
      />
    </div>
  );
}

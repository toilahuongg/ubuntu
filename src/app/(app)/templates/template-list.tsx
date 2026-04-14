"use client";

import { useTransition } from "react";
import { Clock, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { toggleTemplateAction } from "@/app/(app)/actions";
import { SCOPE_LABELS } from "@/lib/domain";
import type { TemplateScope } from "@/lib/domain";

type TemplateSummary = {
  createdAt: string;
  deadlineTime: string;
  description: string;
  expReward: number;
  id: string;
  isActive: boolean;
  regionId: string | null;
  scope: TemplateScope;
  title: string;
  zoneId: string | null;
};

export function TemplateList({
  templates,
}: {
  templates: TemplateSummary[];
}) {
  if (templates.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có mẫu nhiệm vụ nào.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateSummary }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleTemplateAction(template.id);
    });
  }

  return (
    <div className="glass-card flex items-center justify-between p-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{template.title}</h3>
        {template.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {template.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="rounded-md bg-white/5 px-1.5 py-0.5">
            {SCOPE_LABELS[template.scope]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.deadlineTime}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {template.expReward} XP
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              template.isActive
                ? "bg-white/10 text-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {template.isActive ? "Hoạt động" : "Tắt"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="ml-3 cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-50"
        aria-label={template.isActive ? "Tắt template" : "Bật template"}
      >
        {template.isActive ? (
          <ToggleRight className="h-5 w-5 text-foreground" />
        ) : (
          <ToggleLeft className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

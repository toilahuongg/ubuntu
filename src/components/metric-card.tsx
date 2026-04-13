import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  description: string;
  icon?: LucideIcon;
  label: string;
  tone?: "primary" | "success" | "warning" | "neutral";
  value: ReactNode;
};

const toneClasses = {
  neutral: {
    icon: "bg-slate-100 text-slate-700",
    meter: "bg-slate-700",
  },
  primary: {
    icon: "bg-indigo-100 text-indigo-700",
    meter: "bg-indigo-600",
  },
  success: {
    icon: "bg-emerald-100 text-emerald-700",
    meter: "bg-emerald-600",
  },
  warning: {
    icon: "bg-amber-100 text-amber-700",
    meter: "bg-amber-500",
  },
};

export function MetricCard({
  description,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: MetricCardProps) {
  const palette = toneClasses[tone];

  return (
    <Card className="overflow-visible">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-slate-500">
              {label}
            </p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
          {Icon ? (
            <span className={`inline-flex size-11 items-center justify-center rounded-2xl ${palette.icon}`}>
              <Icon className="size-5" />
            </span>
          ) : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full w-2/3 rounded-full ${palette.meter}`} />
        </div>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

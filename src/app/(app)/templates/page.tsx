import { redirect } from "next/navigation";

import {
  createTaskTemplateAction,
  toggleTaskTemplateAction,
} from "@/app/(app)/actions";
import { NoticeBanner } from "@/components/notice-banner";
import { TemplateBuilder } from "@/components/template-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/current-user";
import { getTemplateCollectionForActor } from "@/lib/services/task-service";

type TemplatesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps) {
  const user = await requireCurrentUser();

  if (user.role !== "TEAM_LEAD") {
    redirect("/dashboard");
  }

  const [templates, query] = await Promise.all([
    getTemplateCollectionForActor(user),
    searchParams,
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <NoticeBanner
          tone="error"
          message={typeof query.error === "string" ? query.error : undefined}
        />
        <NoticeBanner
          tone="success"
          message={typeof query.success === "string" ? query.success : undefined}
        />
        <TemplateBuilder action={createTaskTemplateAction} />
      </div>

      <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
        <CardHeader>
          <CardTitle>Template dang co</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length ? (
            templates.map((template) => (
              <div
                key={template.id}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {template.title}
                    </p>
                    <p className="text-sm leading-7 text-slate-600">
                      {template.description}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Deadline {template.deadlineTime} | {template.formSchema.length} fields
                    </p>
                  </div>
                  <form action={toggleTaskTemplateAction}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <Button
                      type="submit"
                      variant={template.isActive ? "outline" : "default"}
                      className={template.isActive ? "" : "bg-emerald-700 text-white hover:bg-emerald-600"}
                    >
                      {template.isActive ? "Tam dung" : "Kich hoat"}
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-sm text-slate-600">
              Chua co template nao. Tao template dau tien o cot ben trai.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

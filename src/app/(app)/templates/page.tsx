import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { canManageTemplates } from "@/lib/permissions";
import { getTemplateCollectionForActor } from "@/lib/services/task-service";
import { TemplateList } from "./template-list";
import { CreateTemplateForm } from "./create-template-form";

export default async function TemplatesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canManageTemplates(session)) {
    redirect("/dashboard");
  }

  const templates = await getTemplateCollectionForActor(session);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Mẫu Nhiệm Vụ</h1>
      </div>

      <CreateTemplateForm />

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Danh sách ({templates.length})
        </h2>
        <TemplateList templates={templates} />
      </section>
    </div>
  );
}

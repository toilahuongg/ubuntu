"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  SerializedUser,
  SubmissionRecord,
  TaskFieldDefinition,
} from "@/lib/domain";

type SubmissionEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  allowedSubjects: SerializedUser[];
  formSchema: TaskFieldDefinition[];
  occurrenceId: string;
  selectedSubject: SerializedUser;
  values?: SubmissionRecord;
};

export function SubmissionEditor({
  action,
  allowedSubjects,
  formSchema,
  occurrenceId,
  selectedSubject,
  values,
}: SubmissionEditorProps) {
  const router = useRouter();

  return (
    <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
      <CardHeader className="space-y-3">
        <CardTitle>Cap nhat ket qua</CardTitle>
        {allowedSubjects.length > 1 ? (
          <div className="space-y-2">
            <Label htmlFor="subject-switcher">Dang dien cho</Label>
            <select
              id="subject-switcher"
              value={selectedSubject.id}
              onChange={(event) =>
                router.push(`/occurrences/${occurrenceId}?subject=${event.target.value}`)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              {allowedSubjects.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="occurrenceId" value={occurrenceId} />
          <input type="hidden" name="subjectUserId" value={selectedSubject.id} />

          {formSchema.map((field) => {
            const fieldName = `field-${field.id}`;
            const initialValue = values?.[field.id];

            if (field.type === "longText") {
              return (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={fieldName}>{field.label}</Label>
                  <Textarea
                    id={fieldName}
                    name={fieldName}
                    defaultValue={typeof initialValue === "string" ? initialValue : ""}
                    placeholder={field.placeholder}
                    rows={5}
                  />
                  {field.helpText ? (
                    <p className="text-xs text-slate-500">{field.helpText}</p>
                  ) : null}
                </div>
              );
            }

            if (field.type === "checkbox") {
              return (
                <label
                  key={field.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name={fieldName}
                    defaultChecked={Boolean(initialValue)}
                    className="size-4 rounded border-slate-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{field.label}</p>
                    {field.helpText ? (
                      <p className="text-xs text-slate-500">{field.helpText}</p>
                    ) : null}
                  </div>
                </label>
              );
            }

            if (field.type === "singleSelect") {
              return (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={fieldName}>{field.label}</Label>
                  <select
                    id={fieldName}
                    name={fieldName}
                    defaultValue={typeof initialValue === "string" ? initialValue : ""}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="">Chon mot gia tri</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {field.helpText ? (
                    <p className="text-xs text-slate-500">{field.helpText}</p>
                  ) : null}
                </div>
              );
            }

            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldName}>{field.label}</Label>
                <Input
                  id={fieldName}
                  name={fieldName}
                  type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                  defaultValue={
                    typeof initialValue === "string" || typeof initialValue === "number"
                      ? String(initialValue)
                      : ""
                  }
                  placeholder={field.placeholder}
                />
                {field.helpText ? (
                  <p className="text-xs text-slate-500">{field.helpText}</p>
                ) : null}
              </div>
            );
          })}

          <Button
            type="submit"
            size="lg"
            className="bg-emerald-700 px-5 text-white hover:bg-emerald-600"
          >
            Luu cap nhat
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

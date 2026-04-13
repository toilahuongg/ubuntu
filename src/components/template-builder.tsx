"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_FIELD_LABELS,
  TASK_FIELD_TYPES,
  type TemplateBuilderField,
} from "@/lib/domain";

function createField(type: (typeof TASK_FIELD_TYPES)[number]): TemplateBuilderField {
  return {
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    label: "",
    optionText: type === "singleSelect" ? "Dat, Chua dat" : "",
    required: false,
    type,
  };
}

type TemplateBuilderProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function TemplateBuilder({ action }: TemplateBuilderProps) {
  const [fields, setFields] = useState<TemplateBuilderField[]>([
    createField("shortText"),
  ]);

  const serializedFields = JSON.stringify(
    fields.map((field) => ({
      helpText: field.helpText?.trim() || undefined,
      id: field.id,
      label: field.label.trim(),
      options:
        field.type === "singleSelect"
          ? (field.optionText || "")
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean)
              .map((option) => ({ label: option, value: option }))
          : undefined,
      placeholder: field.placeholder?.trim() || undefined,
      required: field.required,
      type: field.type,
    })),
  );

  return (
    <form action={action} className="space-y-5">
      <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
        <CardHeader>
          <CardTitle>Tao mau nhiem vu hang ngay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tieu de</Label>
              <Input id="title" name="title" placeholder="Bao cao diem ban hom nay" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadlineTime">Deadline</Label>
              <Input id="deadlineTime" name="deadlineTime" type="time" defaultValue="17:30" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mo ta ngan</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Mo ta nhanh muc dich va cach dien"
              rows={4}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="size-4 rounded border-slate-300 text-emerald-700"
            />
            Bat template ngay sau khi tao
          </label>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Form dong</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Nhom truong cau hinh field de he thong sinh form dien moi ngay.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TASK_FIELD_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFields((current) => [...current, createField(type)])}
              >
                <PlusIcon />
                {TASK_FIELD_LABELS[type]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Truong {index + 1}: {TASK_FIELD_LABELS[field.type]}
                  </p>
                  <p className="text-xs text-slate-500">ID: {field.id}</p>
                </div>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setFields((current) => current.filter((item) => item.id !== field.id))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tieu de field</Label>
                  <Input
                    value={field.label}
                    placeholder="VD: Tong doanh so"
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((item) =>
                          item.id === field.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input
                    value={field.placeholder || ""}
                    placeholder="Nhap gia tri..."
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((item) =>
                          item.id === field.id
                            ? { ...item, placeholder: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <Label>Goi y / mo ta</Label>
                <Input
                  value={field.helpText || ""}
                  placeholder="Hien thi o duoi field cho nguoi dien"
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id
                          ? { ...item, helpText: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>

              {field.type === "singleSelect" ? (
                <div className="mt-3 space-y-2">
                  <Label>Tuy chon</Label>
                  <Input
                    value={field.optionText || ""}
                    placeholder="Nhap cac tuy chon, cach nhau boi dau phay"
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((item) =>
                          item.id === field.id
                            ? { ...item, optionText: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              ) : null}

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id
                          ? { ...item, required: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Truong bat buoc
              </label>
            </div>
          ))}

          <input type="hidden" name="formSchemaJson" value={serializedFields} />

          <Button
            type="submit"
            size="lg"
            className="bg-emerald-700 px-5 text-white hover:bg-emerald-600"
          >
            Luu template
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

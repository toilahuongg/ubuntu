"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Pencil, X } from "lucide-react";

import { updateProfileAction } from "@/app/(app)/profile/actions";
import { FormSuccess } from "@/app/(app)/admin/_shared";

type Props = {
  compact?: boolean;
  initialFullName: string;
  initialGender: "male" | "female";
  initialBio: string;
  level: number;
};

function badgeSrc(level: number, gender: "male" | "female") {
  const capped = level > 18 ? 18 : level < 1 ? 1 : level;
  return `/badges/badge-${capped}-${gender}.png`;
}

export function EditProfileForm({
  compact = false,
  initialFullName,
  initialGender,
  initialBio,
  level,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [gender, setGender] = useState<"male" | "female">(initialGender);
  const [bio, setBio] = useState(initialBio);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.ok) {
        setSuccess("Đã lưu thay đổi hồ sơ.");
        setIsOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (!isOpen) {
    return (
      <div className="space-y-2">
        {success && (
          <FormSuccess message={success} onDismiss={() => setSuccess(null)} />
        )}
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setIsOpen(true);
          }}
          className={`flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-overlay-medium ${
            compact ? "bg-overlay-subtle" : ""
          }`}
        >
          <Pencil className="h-4 w-4" />
          Chỉnh sửa hồ sơ
        </button>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className={`space-y-4 p-4 ${
        compact
          ? "rounded-xl border border-border bg-overlay-subtle"
          : "glass-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Chỉnh sửa hồ sơ</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Đóng biểu mẫu chỉnh sửa hồ sơ"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center">
        <Image
          src={badgeSrc(level, gender)}
          alt={`Huy hiệu cấp ${level} (${gender === "male" ? "nam" : "nữ"})`}
          width={72}
          height={72}
          className="drop-shadow-lg"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Ảnh đại diện thay đổi theo giới tính
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-fullname" className="text-xs font-medium text-muted-foreground">
          Biệt danh
        </label>
        <input
          id="profile-fullname"
          name="fullName"
          defaultValue={initialFullName}
          required
          maxLength={60}
          autoComplete="name"
          inputMode="text"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "profile-error" : undefined}
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted-foreground">
          Giới tính
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((value) => (
            <label
              key={value}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-xl border text-sm transition-colors focus-within:ring-2 focus-within:ring-primary/60 ${
                gender === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-overlay-medium"
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={value}
                checked={gender === value}
                onChange={() => setGender(value)}
                className="sr-only"
              />
              {value === "male" ? "Nam" : "Nữ"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="profile-bio" className="text-xs font-medium text-muted-foreground">
          Tiểu sử
        </label>
        <textarea
          id="profile-bio"
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Giới thiệu đôi nét về bạn…"
          aria-describedby="profile-bio-count"
          className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <p id="profile-bio-count" className="text-right text-[10px] text-muted-foreground">
          {bio.length}/280
        </p>
      </div>

      {error && (
        <p id="profile-error" className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background"
            />
            Đang lưu…
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </form>
  );
}

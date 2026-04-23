"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { saveUserAction } from "@/app/(app)/actions";
import { ROLE_LABELS } from "@/lib/domain";
import type { Role } from "@/lib/domain";
import { FormError, FormSuccess } from "./_shared";

type Team = { id: string; name: string };
type Zone = { id: string; name: string; teamId: string; teamName?: string };
type Region = {
  id: string;
  name: string;
  teamId: string;
  zoneId: string;
  zoneName?: string;
};

export function CreateUserForm({
  teams,
  zones,
  regions,
  roleOptions,
}: {
  teams: Team[];
  zones: Zone[];
  regions: Region[];
  roleOptions: Role[];
}) {
  const defaultRole: Role = roleOptions.includes("MEMBER")
    ? "MEMBER"
    : (roleOptions[0] ?? "MEMBER");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(defaultRole);
  const [teamId, setTeamId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [regionId, setRegionId] = useState("");

  const zonesForTeam = useMemo(
    () => zones.filter((z) => !teamId || z.teamId === teamId),
    [zones, teamId],
  );

  const regionsForZone = useMemo(
    () => regions.filter((r) => !zoneId || r.zoneId === zoneId),
    [regions, zoneId],
  );

  function onTeamChange(value: string) {
    setTeamId(value);
    if (!zones.find((z) => z.id === zoneId && z.teamId === value)) {
      setZoneId("");
      setRegionId("");
    }
  }

  function onZoneChange(value: string) {
    setZoneId(value);
    if (!regions.find((r) => r.id === regionId && r.zoneId === value)) {
      setRegionId("");
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveUserAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSuccess("Đã tạo người dùng thành công.");
      setIsOpen(false);
      setRole(defaultRole);
      setTeamId("");
      setZoneId("");
      setRegionId("");
    });
  }

  if (roleOptions.length === 0) return null;

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
          className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm người dùng
        </button>
      </div>
    );
  }

  const needsTeam = role === "TEAM_LEAD" || role === "ZONE_LEAD" || role === "REGIONAL_LEAD" || role === "NGV" || role === "MEMBER";
  const needsZone = role === "ZONE_LEAD";
  const needsRegion =
    role === "REGIONAL_LEAD" || role === "NGV" || role === "MEMBER";

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tạo người dùng mới</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        name="fullName"
        required
        placeholder="Biệt danh"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="form-select"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue="ACTIVE" className="form-select">
          <option value="ACTIVE">Hoạt động</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="INACTIVE">Khóa</option>
        </select>
      </div>

      <select name="gender" defaultValue="male" className="form-select">
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
      </select>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Nhóm
        </label>
        <select
          name={needsTeam || role === "ADMIN" ? "teamId" : undefined}
          value={teamId}
          onChange={(e) => onTeamChange(e.target.value)}
          required={needsTeam || needsZone || needsRegion}
          className="form-select"
        >
          <option value="">Chọn nhóm</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {(needsZone || needsRegion) && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Địa Vực
          </label>
          <select
            name={needsZone ? "zoneId" : undefined}
            value={zoneId}
            onChange={(e) => onZoneChange(e.target.value)}
            required
            disabled={!teamId}
            className="form-select disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Chọn địa vực</option>
            {zonesForTeam.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsRegion && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Khu vực
          </label>
          <select
            name="regionId"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            required
            disabled={!zoneId}
            className="form-select disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Chọn khu vực</option>
            {regionsForZone.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Người dùng tạo tại đây chưa liên kết Telegram. Họ cần đăng nhập bằng
        Telegram để được gán ID.
      </p>

      {error && <FormError message={error} onDismiss={() => setError(null)} />}

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
            Đang tạo…
          </>
        ) : (
          "Tạo người dùng"
        )}
      </button>
    </form>
  );
}

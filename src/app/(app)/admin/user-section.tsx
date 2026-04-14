"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";

import { saveUserAction } from "@/app/(app)/actions";
import { ROLE_LABELS, ROLES } from "@/lib/domain";
import type { Role, SerializedUser } from "@/lib/domain";

type Zone = { id: string; name: string; teamId: string; teamName?: string };
type Region = {
  id: string;
  name: string;
  teamId: string;
  zoneId: string;
  zoneName?: string;
};
type Team = { id: string; name: string };

export function UserSection({
  users,
  teams,
  zones,
  regions,
}: {
  users: SerializedUser[];
  teams: Team[];
  zones: Zone[];
  regions: Region[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có người dùng nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {users.map((user) =>
        editingId === user.id ? (
          <EditUserRow
            key={user.id}
            user={user}
            teams={teams}
            zones={zones}
            regions={regions}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_LABELS[user.role]}
                {user.username && ` · @${user.username}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  user.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : user.status === "PENDING"
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.status === "ACTIVE"
                      ? "bg-emerald-400"
                      : user.status === "PENDING"
                        ? "bg-yellow-400"
                        : "bg-destructive"
                  }`}
                />
                {user.status === "ACTIVE"
                  ? "Hoạt động"
                  : user.status === "PENDING"
                    ? "Chờ duyệt"
                    : "Khóa"}
              </span>
              <button
                type="button"
                onClick={() => setEditingId(user.id)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label={`Sửa ${user.fullName}`}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function EditUserRow({
  user,
  teams,
  zones,
  regions,
  onClose,
}: {
  user: SerializedUser;
  teams: Team[];
  zones: Zone[];
  regions: Region[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(user.role);
  const [teamId, setTeamId] = useState<string>(user.teamId ?? "");
  const [zoneId, setZoneId] = useState<string>(user.zoneId ?? "");
  const [regionId, setRegionId] = useState<string>(user.regionId ?? "");

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
    // reset downstream if no longer valid
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
    startTransition(async () => {
      await saveUserAction(formData);
      onClose();
    });
  }

  const needsTeam = role === "TEAM_LEAD";
  const needsZone = role === "ZONE_LEAD";
  const needsRegion = role === "REGIONAL_LEAD" || role === "MEMBER";

  return (
    <form action={handleSubmit} className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sửa người dùng
        </p>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input type="hidden" name="userId" value={user.id} />
      <input
        name="fullName"
        required
        defaultValue={user.fullName}
        placeholder="Biệt danh"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="form-select"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={user.status} className="form-select">
          <option value="ACTIVE">Hoạt động</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="INACTIVE">Khóa</option>
        </select>
      </div>

      <select name="gender" defaultValue={user.gender ?? "male"} className="form-select">
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
      </select>

      {/* Cascade: Nhóm */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Nhóm
        </label>
        <select
          name={needsTeam ? "teamId" : undefined}
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

      {/* Cascade: Địa Vực */}
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

      {/* Cascade: Khu vực */}
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

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
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

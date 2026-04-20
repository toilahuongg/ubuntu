"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Filter, Pencil, Search, X } from "lucide-react";

import { deleteUserAction, saveUserAction } from "@/app/(app)/actions";
import { ROLE_LABELS, ROLES, USER_STATUSES } from "@/lib/domain";
import type { Role, SerializedUser, UserStatus } from "@/lib/domain";
import { ConfirmDeleteButton, FormError } from "./_shared";

type Zone = { id: string; name: string; teamId: string; teamName?: string };
type Region = {
  id: string;
  name: string;
  teamId: string;
  zoneId: string;
  zoneName?: string;
};
type Team = { id: string; name: string };

type SortKey = "name" | "role" | "status" | "recent";

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Khóa",
  PENDING: "Chờ duyệt",
};

export function UserSection({
  currentUserId,
  users,
  teams,
  zones,
  regions,
}: {
  currentUserId: string;
  users: SerializedUser[];
  teams: Team[];
  zones: Zone[];
  regions: Region[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        (u.username?.toLowerCase().includes(q) ?? false)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.fullName.localeCompare(b.fullName, "vi");
      if (sortKey === "role") return ROLES.indexOf(a.role) - ROLES.indexOf(b.role);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      // recent: server already returns by createdAt desc; preserve order.
      return 0;
    });
    return list;
  }, [users, query, roleFilter, statusFilter, sortKey]);

  const hasActiveFilter =
    query.length > 0 || roleFilter !== "ALL" || statusFilter !== "ALL";

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="glass-card space-y-2 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc @username…"
            className="h-9 w-full rounded-xl bg-overlay-subtle border border-border pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-overlay-medium"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
            className="form-select h-9 text-[12px]"
            aria-label="Lọc theo vai trò"
          >
            <option value="ALL">Tất cả vai trò</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as UserStatus | "ALL")
            }
            className="form-select h-9 text-[12px]"
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="form-select h-9 text-[12px]"
            aria-label="Sắp xếp"
          >
            <option value="recent">Mới nhất</option>
            <option value="name">Theo tên</option>
            <option value="role">Theo vai trò</option>
            <option value="status">Theo trạng thái</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {filtered.length}/{users.length}
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRoleFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="cursor-pointer text-primary hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card py-8 text-center text-sm text-muted-foreground">
          {users.length === 0
            ? "Chưa có người dùng nào."
            : "Không tìm thấy người dùng phù hợp."}
        </div>
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {filtered.map((user) =>
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
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUserId}
                onEdit={() => setEditingId(user.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onEdit,
}: {
  user: SerializedUser;
  isSelf: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.fullName}
          {isSelf && (
            <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              BẠN
            </span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {ROLE_LABELS[user.role]}
          {user.username && ` · @${user.username}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={user.status} />
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={`Sửa ${user.fullName}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        {!isSelf && (
          <ConfirmDeleteButton
            ariaLabel={`Xóa ${user.fullName}`}
            onConfirm={() => deleteUserAction(user.id)}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const color =
    status === "ACTIVE"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "PENDING"
        ? "bg-yellow-500/15 text-yellow-400"
        : "bg-destructive/15 text-destructive";
  const dot =
    status === "ACTIVE"
      ? "bg-emerald-400"
      : status === "PENDING"
        ? "bg-yellow-400"
        : "bg-destructive";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {STATUS_LABELS[status]}
    </span>
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
  const [error, setError] = useState<string | null>(null);

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
    startTransition(async () => {
      const result = await saveUserAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  const needsTeam = role === "TEAM_LEAD";
  const needsZone = role === "ZONE_LEAD";
  const needsRegion =
    role === "REGIONAL_LEAD" || role === "NGV" || role === "MEMBER";

  const isDemotingLead =
    (user.role === "TEAM_LEAD" ||
      user.role === "ZONE_LEAD" ||
      user.role === "REGIONAL_LEAD") &&
    role !== user.role;

  return (
    <form action={handleSubmit} className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sửa người dùng
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {isDemotingLead && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[12px] text-yellow-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Bạn đang đổi vai trò của một {ROLE_LABELS[user.role]}. Các phân công
            lãnh đạo hiện tại sẽ được gỡ bỏ tự động.
          </span>
        </div>
      )}

      <select name="gender" defaultValue={user.gender ?? "male"} className="form-select">
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
      </select>

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
            Đang lưu…
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </form>
  );
}

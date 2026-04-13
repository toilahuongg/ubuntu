import { createRegionAction, createTeamAction, saveUserAction } from "@/app/(app)/actions";
import { NoticeBanner } from "@/components/notice-banner";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminUser } from "@/lib/current-user";
import { ROLES, USER_STATUSES } from "@/lib/domain";
import { getAdminSnapshot } from "@/lib/services/organization-service";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminUser();

  const [snapshot, query] = await Promise.all([getAdminSnapshot(), searchParams]);
  const editingUserId =
    typeof query.editUser === "string" ? query.editUser : undefined;
  const editingUser = snapshot.users.find((user) => user.id === editingUserId);

  return (
    <div className="space-y-6">
      <NoticeBanner
        tone="error"
        message={typeof query.error === "string" ? query.error : undefined}
      />
      <NoticeBanner
        tone="success"
        message={typeof query.success === "string" ? query.success : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
          <CardHeader>
            <CardTitle>Tao nhom</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeamAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="team-name">Ten nhom</Label>
                <Input id="team-name" name="name" placeholder="Team mien Nam" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-code">Ma nhom</Label>
                <Input id="team-code" name="code" placeholder="TEAM-MIEN-NAM" />
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                Luu nhom
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
          <CardHeader>
            <CardTitle>Tao khu vuc</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createRegionAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="region-name">Ten khu vuc</Label>
                <Input id="region-name" name="name" placeholder="Khu vuc Ha Noi" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region-code">Ma khu vuc</Label>
                <Input id="region-code" name="code" placeholder="HN-01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region-team">Thuoc nhom</Label>
                <select
                  id="region-team"
                  name="teamId"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Chon team</option>
                  {snapshot.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                Luu khu vuc
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
          <CardHeader>
            <CardTitle>{editingUser ? "Cap nhat nguoi dung" : "Them nguoi dung"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveUserAction} className="space-y-3">
              {editingUser ? <input type="hidden" name="userId" value={editingUser.id} /> : null}
              <div className="space-y-2">
                <Label htmlFor="fullName">Ho ten</Label>
                <Input id="fullName" name="fullName" defaultValue={editingUser?.fullName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username Telegram</Label>
                <Input id="username" name="username" defaultValue={editingUser?.username || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramId">Telegram ID</Label>
                <Input
                  id="telegramId"
                  name="telegramId"
                  type="number"
                  defaultValue={editingUser?.telegramId || ""}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Vai tro</Label>
                  <select
                    id="role"
                    name="role"
                    defaultValue={editingUser?.role || "MEMBER"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Trang thai</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={editingUser?.status || "ACTIVE"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamId">Team</Label>
                <select
                  id="teamId"
                  name="teamId"
                  defaultValue={editingUser?.teamId || ""}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Khong gan team</option>
                  {snapshot.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regionId">Khu vuc</Label>
                <select
                  id="regionId"
                  name="regionId"
                  defaultValue={editingUser?.regionId || ""}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Khong gan khu vuc</option>
                  {snapshot.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} - {region.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-600">
                {editingUser ? "Cap nhat" : "Them moi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
          <CardHeader>
            <CardTitle>Nguoi dung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{user.fullName}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={user.role} />
                    {user.telegramId ? (
                      <span className="text-xs text-slate-500">
                        Telegram: {user.telegramId}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700">Chua map Telegram</span>
                    )}
                  </div>
                </div>
                <a
                  href={`/admin?editUser=${user.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                  Chinh sua
                </a>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
            <CardHeader>
              <CardTitle>Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <p className="font-medium text-slate-900">{team.name}</p>
                  <p className="text-sm text-slate-600">
                    {team.code} | {team.memberCount} thanh vien
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
            <CardHeader>
              <CardTitle>Khu vuc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.regions.map((region) => (
                <div
                  key={region.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <p className="font-medium text-slate-900">{region.name}</p>
                  <p className="text-sm text-slate-600">
                    {region.teamName} | {region.memberCount} thanh vien
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";

import { completePendingUserScopeAction } from "@/app/(app)/actions";
import { FormError } from "@/app/(app)/admin/_shared";

type TeamOption = { id: string; name: string };
type ZoneOption = { id: string; name: string; teamId: string };

export function PendingScopeForm({
  teams,
  zones,
}: {
  teams: TeamOption[];
  zones: ZoneOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [teamId, setTeamId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const zonesForTeam = useMemo(
    () => zones.filter((zone) => !teamId || zone.teamId === teamId),
    [teamId, zones],
  );

  function handleTeamChange(value: string) {
    setTeamId(value);
    if (!zones.find((zone) => zone.id === zoneId && zone.teamId === value)) {
      setZoneId("");
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await completePendingUserScopeAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-5">
      <select
        name="teamId"
        value={teamId}
        onChange={(event) => handleTeamChange(event.target.value)}
        required
        className="form-select h-11"
      >
        <option value="">Chọn Nhóm</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <select
        name="zoneId"
        value={zoneId}
        onChange={(event) => setZoneId(event.target.value)}
        required
        disabled={!teamId}
        className="form-select h-11 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Chọn Địa Vực</option>
        {zonesForTeam.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      <button
        type="submit"
        disabled={isPending}
        className="btn-gradient flex h-11 w-full items-center justify-center text-sm disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Đang lưu..." : "Gửi thông tin"}
      </button>
    </form>
  );
}

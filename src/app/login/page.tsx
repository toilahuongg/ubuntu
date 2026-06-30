import { Suspense } from "react";

import {
  listDevLoginUsers,
  listTeams,
  listZones,
} from "@/lib/services/organization-service";

import { DevLoginPanel } from "./dev-login-panel";
import { LoginContent } from "./login-content";

export default async function LoginPage() {
  const isDev = process.env.NODE_ENV !== "production";
  const [devUsers, teams, zones] = await Promise.all([
    isDev ? listDevLoginUsers().catch(() => []) : Promise.resolve([]),
    listTeams().catch(() => []),
    listZones().catch(() => []),
  ]);
  const teamOptions = teams.map((team) => ({
    id: team._id.toString(),
    name: team.name,
  }));
  const zoneOptions = zones.map((zone) => ({
    id: zone._id.toString(),
    name: zone.name,
    teamId: zone.teamId.toString(),
  }));

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </main>
      }
    >
      <LoginContent teams={teamOptions} zones={zoneOptions} />
      {isDev && <DevLoginPanel users={devUsers} />}
    </Suspense>
  );
}

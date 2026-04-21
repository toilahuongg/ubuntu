import "server-only";

import type { SessionUser } from "@/lib/domain";
import {
  RegionModel,
  type RegionRecord,
  TeamModel,
  type TeamRecord,
  ZoneModel,
  type ZoneRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { listPendingGroups } from "@/lib/services/telegram-binding-service";
import { toObjectId } from "@/lib/utils/ids";

import { TelegramBindingCard } from "./telegram-binding-card";
import {
  bindRegionTelegramAction,
  bindTeamTelegramAction,
  bindZoneTelegramAction,
  unbindRegionTelegramAction,
  unbindTeamTelegramAction,
  unbindZoneTelegramAction,
} from "./telegram-actions";

type HasTelegram = {
  _id: { toString(): string };
  name: string;
  telegramChatId?: number | null;
  telegramChatTitle?: string | null;
};

function toEntity(doc: HasTelegram) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    telegramChatId: doc.telegramChatId ?? null,
    telegramChatTitle: doc.telegramChatTitle ?? null,
  };
}

async function loadScope(session: SessionUser) {
  await connectToDatabase();

  if (session.role === "ADMIN") {
    const [teams, zones, regions] = await Promise.all([
      TeamModel.find().sort({ name: 1 }).lean() as Promise<TeamRecord[]>,
      ZoneModel.find().sort({ name: 1 }).lean() as Promise<ZoneRecord[]>,
      RegionModel.find().sort({ name: 1 }).lean() as Promise<RegionRecord[]>,
    ]);
    return { teams, zones, regions };
  }

  if (session.role === "TEAM_LEAD" && session.teamId) {
    const teamObjectId = toObjectId(session.teamId);
    const [teams, zones, regions] = await Promise.all([
      TeamModel.find({ _id: teamObjectId })
        .sort({ name: 1 })
        .lean() as Promise<TeamRecord[]>,
      ZoneModel.find({ teamId: teamObjectId })
        .sort({ name: 1 })
        .lean() as Promise<ZoneRecord[]>,
      RegionModel.find({ teamId: teamObjectId })
        .sort({ name: 1 })
        .lean() as Promise<RegionRecord[]>,
    ]);
    return { teams, zones, regions };
  }

  if (session.role === "ZONE_LEAD" && session.zoneId) {
    const zoneObjectId = toObjectId(session.zoneId);
    const [zones, regions] = await Promise.all([
      ZoneModel.find({ _id: zoneObjectId }).lean() as Promise<ZoneRecord[]>,
      RegionModel.find({ zoneId: zoneObjectId })
        .sort({ name: 1 })
        .lean() as Promise<RegionRecord[]>,
    ]);
    return { teams: [], zones, regions };
  }

  if (session.role === "REGIONAL_LEAD" && session.regionId) {
    const regions = (await RegionModel.find({
      _id: toObjectId(session.regionId),
    }).lean()) as RegionRecord[];
    return { teams: [], zones: [], regions };
  }

  return { teams: [], zones: [], regions: [] };
}

export async function TelegramSection({ session }: { session: SessionUser }) {
  const [scope, pendingGroups] = await Promise.all([
    loadScope(session),
    listPendingGroups(),
  ]);

  const hasAnything =
    scope.teams.length + scope.zones.length + scope.regions.length > 0;

  if (!hasAnything) {
    return (
      <div className="glass-card py-6 text-center text-sm text-muted-foreground">
        Chưa có phạm vi nào để cấu hình Telegram.
      </div>
    );
  }

  const pendingOptions = pendingGroups.map((group) => ({
    chatId: group.chatId,
    title: group.title,
  }));

  return (
    <div className="space-y-3">
      {scope.teams.map((team) => (
        <TelegramBindingCard
          key={team._id.toString()}
          levelLabel="Nhóm"
          entity={toEntity(team as unknown as HasTelegram)}
          pendingGroups={pendingOptions}
          bindAction={bindTeamTelegramAction}
          unbindAction={unbindTeamTelegramAction}
        />
      ))}
      {scope.zones.map((zone) => (
        <TelegramBindingCard
          key={zone._id.toString()}
          levelLabel="Địa vực"
          entity={toEntity(zone as unknown as HasTelegram)}
          pendingGroups={pendingOptions}
          bindAction={bindZoneTelegramAction}
          unbindAction={unbindZoneTelegramAction}
        />
      ))}
      {scope.regions.map((region) => (
        <TelegramBindingCard
          key={region._id.toString()}
          levelLabel="Khu vực"
          entity={toEntity(region as unknown as HasTelegram)}
          pendingGroups={pendingOptions}
          bindAction={bindRegionTelegramAction}
          unbindAction={unbindRegionTelegramAction}
        />
      ))}
    </div>
  );
}

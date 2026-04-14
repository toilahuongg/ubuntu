"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageRegionTelegram,
  canManageTeamTelegram,
  canManageZoneTelegram,
} from "@/lib/permissions";
import {
  getRegionById,
  getZoneById,
} from "@/lib/services/organization-service";
import {
  bindGroup,
  unbindGroup,
} from "@/lib/services/telegram-binding-service";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export async function bindTeamTelegramAction(
  teamId: string,
  chatId: number,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!canManageTeamTelegram(session, teamId)) {
      throw new Error("Bạn không có quyền cấu hình nhóm Telegram cho Nhóm này.");
    }
    await bindGroup({ level: "team", id: teamId, chatId });
    revalidatePath("/admin");
  });
}

export async function unbindTeamTelegramAction(
  teamId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!canManageTeamTelegram(session, teamId)) {
      throw new Error("Bạn không có quyền cấu hình nhóm Telegram cho Nhóm này.");
    }
    await unbindGroup({ level: "team", id: teamId });
    revalidatePath("/admin");
  });
}

export async function bindZoneTelegramAction(
  zoneId: string,
  chatId: number,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const zone = await getZoneById(zoneId);
    if (!zone) throw new Error("Địa vực không tồn tại.");
    if (
      !canManageZoneTelegram(session, {
        id: zoneId,
        teamId: zone.teamId.toString(),
      })
    ) {
      throw new Error(
        "Bạn không có quyền cấu hình nhóm Telegram cho Địa vực này.",
      );
    }
    await bindGroup({ level: "zone", id: zoneId, chatId });
    revalidatePath("/admin");
  });
}

export async function unbindZoneTelegramAction(
  zoneId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const zone = await getZoneById(zoneId);
    if (!zone) throw new Error("Địa vực không tồn tại.");
    if (
      !canManageZoneTelegram(session, {
        id: zoneId,
        teamId: zone.teamId.toString(),
      })
    ) {
      throw new Error(
        "Bạn không có quyền cấu hình nhóm Telegram cho Địa vực này.",
      );
    }
    await unbindGroup({ level: "zone", id: zoneId });
    revalidatePath("/admin");
  });
}

export async function bindRegionTelegramAction(
  regionId: string,
  chatId: number,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const region = await getRegionById(regionId);
    if (!region) throw new Error("Khu vực không tồn tại.");
    const zoneIdRaw = (region as { zoneId?: { toString(): string } }).zoneId;
    if (
      !canManageRegionTelegram(session, {
        id: regionId,
        teamId: region.teamId.toString(),
        zoneId: zoneIdRaw ? zoneIdRaw.toString() : "",
      })
    ) {
      throw new Error(
        "Bạn không có quyền cấu hình nhóm Telegram cho Khu vực này.",
      );
    }
    await bindGroup({ level: "region", id: regionId, chatId });
    revalidatePath("/admin");
  });
}

export async function unbindRegionTelegramAction(
  regionId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const region = await getRegionById(regionId);
    if (!region) throw new Error("Khu vực không tồn tại.");
    const zoneIdRaw = (region as { zoneId?: { toString(): string } }).zoneId;
    if (
      !canManageRegionTelegram(session, {
        id: regionId,
        teamId: region.teamId.toString(),
        zoneId: zoneIdRaw ? zoneIdRaw.toString() : "",
      })
    ) {
      throw new Error(
        "Bạn không có quyền cấu hình nhóm Telegram cho Khu vực này.",
      );
    }
    await unbindGroup({ level: "region", id: regionId });
    revalidatePath("/admin");
  });
}

import "server-only";

import {
  verifyTelegramInitData,
  verifyTelegramLoginWidget,
} from "@/lib/auth/telegram";
import type { TelegramLoginWidgetData, TelegramProfile } from "@/lib/auth/telegram";
import type { SessionUser } from "@/lib/domain";
import {
  createPendingUser,
  getUserById,
  getUserByTelegramId,
  markUserLogin,
} from "@/lib/services/organization-service";

function buildFullName(profile: TelegramProfile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `User ${profile.id}`;
}

async function resolveOrCreateUser(profile: TelegramProfile): Promise<SessionUser> {
  const user = await getUserByTelegramId(profile.id);

  if (user) {
    if (user.status === "INACTIVE") {
      throw new Error("Tài khoản của bạn đã bị khóa.");
    }

    if (user.status === "ACTIVE") {
      await markUserLogin(user.id);
    }

    return user;
  }

  return createPendingUser({
    fullName: buildFullName(profile),
    telegramId: profile.id,
    username: profile.username,
  });
}

export async function authenticateTelegramUser(initData: string) {
  const telegramProfile = verifyTelegramInitData(initData);
  return resolveOrCreateUser(telegramProfile);
}

export async function authenticateTelegramWidget(data: TelegramLoginWidgetData) {
  const telegramProfile = verifyTelegramLoginWidget(data);
  return resolveOrCreateUser(telegramProfile);
}

export async function refreshSessionUser(userId: string) {
  const user = await getUserById(userId);
  return user && (user.status === "ACTIVE" || user.status === "PENDING")
    ? (user satisfies SessionUser)
    : null;
}

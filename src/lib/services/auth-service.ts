import "server-only";

import {
  verifyTelegramInitData,
  verifyTelegramLoginWidget,
} from "@/lib/auth/telegram";
import type { TelegramLoginWidgetData, TelegramProfile } from "@/lib/auth/telegram";
import type { SessionUser } from "@/lib/domain";
import {
  createPendingGoogleUser,
  createPendingUser,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
  getUserByTelegramId,
  linkGoogleAccount,
  markUserLogin,
} from "@/lib/services/organization-service";

export type GoogleProfile = {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
};

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

export async function authenticateGoogleUser(
  profile: GoogleProfile,
): Promise<SessionUser> {
  const byGoogle = await getUserByGoogleId(profile.googleId);
  if (byGoogle) {
    if (byGoogle.status === "INACTIVE") {
      throw new Error("Tài khoản của bạn đã bị khóa.");
    }
    if (byGoogle.status === "ACTIVE") {
      await markUserLogin(byGoogle.id);
    }
    return byGoogle;
  }

  const byEmail = profile.email ? await getUserByEmail(profile.email) : null;
  if (byEmail) {
    if (byEmail.status === "INACTIVE") {
      throw new Error("Tài khoản của bạn đã bị khóa.");
    }
    const linked = await linkGoogleAccount(byEmail.id, {
      googleId: profile.googleId,
      email: profile.email,
      avatarUrl: profile.avatarUrl ?? null,
    });
    if (linked.status === "ACTIVE") {
      await markUserLogin(linked.id);
    }
    return linked;
  }

  return createPendingGoogleUser({
    fullName: profile.fullName || profile.email || "Người dùng Google",
    googleId: profile.googleId,
    email: profile.email,
    avatarUrl: profile.avatarUrl ?? null,
  });
}

export async function refreshSessionUser(userId: string) {
  const user = await getUserById(userId);
  return user && (user.status === "ACTIVE" || user.status === "PENDING")
    ? (user satisfies SessionUser)
    : null;
}

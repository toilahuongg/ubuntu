import "server-only";

import { verifyTelegramInitData } from "@/lib/auth/telegram";
import type { SessionUser } from "@/lib/domain";
import {
  getUserById,
  getUserByTelegramId,
  markUserLogin,
} from "@/lib/services/organization-service";

export async function authenticateTelegramUser(initData: string) {
  const telegramProfile = verifyTelegramInitData(initData);
  const user = await getUserByTelegramId(telegramProfile.id);

  if (!user || user.status !== "ACTIVE") {
    throw new Error(
      "Tai khoan Telegram nay chua duoc admin gan quyen hoac da bi khoa.",
    );
  }

  await markUserLogin(user.id);
  return user satisfies SessionUser;
}

export async function refreshSessionUser(userId: string) {
  const user = await getUserById(userId);
  return user && user.status === "ACTIVE" ? (user satisfies SessionUser) : null;
}

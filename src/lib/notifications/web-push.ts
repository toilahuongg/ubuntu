import "server-only";

import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { connectToDatabase } from "@/lib/mongoose";
import { PushSubscriptionModel } from "@/lib/models/push-subscription";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured() {
  return ensureConfigured();
}

export async function sendWebPushToSubscription(
  subscription: WebPushSubscription,
  payload: WebPushPayload,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  if (!ensureConfigured()) return { ok: false, error: "vapid_not_configured" };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24,
    });
    return { ok: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, statusCode, error: message };
  }
}

export async function safeSendWebPush(
  userId: string,
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, removed: 0 };

  await connectToDatabase();
  const subs = await PushSubscriptionModel.find({ userId }).lean();

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const staleIds: unknown[] = [];

  await Promise.all(
    subs.map(async (sub: {
      _id: unknown;
      endpoint: string;
      p256dh: string;
      auth: string;
    }) => {
      const result = await sendWebPushToSubscription(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      if (result.ok) {
        sent += 1;
        return;
      }
      failed += 1;
      if (result.statusCode === 404 || result.statusCode === 410) {
        staleIds.push(sub._id);
      } else {
        console.error(
          `[web-push] send failed for user ${userId} endpoint=${sub.endpoint.slice(0, 40)}...: ${result.error}`,
        );
      }
    }),
  );

  if (staleIds.length > 0) {
    const res = await PushSubscriptionModel.deleteMany({ _id: { $in: staleIds } });
    removed = res.deletedCount ?? staleIds.length;
  }

  return { sent, failed, removed };
}

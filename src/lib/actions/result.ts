import "server-only";

/**
 * Unified server action return shape. Actions surface domain errors here
 * instead of throwing so clients can show inline banners.
 */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

import { unstable_rethrow } from "next/navigation";

function toActionError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: toActionError(err) };
  }
}

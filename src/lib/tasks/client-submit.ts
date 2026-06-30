"use client";

export type SubmitTaskClientInput = {
  taskId: string;
  subjectUserId: string;
  dateKey?: string;
  count?: number;
  mode?: "increment" | "set";
  revalidationPaths?: readonly string[];
};

export type StreakBonusResult = {
  awarded: boolean;
  bonusExp: number;
  bonusPoints: number;
  milestone: number | null;
  streakLength: number;
};

export type SubmitTaskClientData = {
  completionCount: number;
  isFirstSubmission: boolean;
  leveledUp: boolean;
  newLevel: number | null;
  streakBonus: StreakBonusResult;
  submissionId: string;
  taskJustCompleted: boolean;
  xpAwarded: number;
};

export type SubmitTaskClientResult =
  | { status: "success"; data?: SubmitTaskClientData }
  | { status: "timeout_unknown"; message: string }
  | { status: "error"; message: string };

type SubmitTaskClientOptions = {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const TIMEOUT_MESSAGE =
  "Kết nối đang chậm. Yêu cầu có thể đã được ghi nhận, đang đồng bộ lại...";

export async function submitTaskViaApi(
  input: SubmitTaskClientInput,
  options: SubmitTaskClientOptions = {},
): Promise<SubmitTaskClientResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/tasks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });

    let payload: ClientActionResult<SubmitTaskClientData> | null = null;
    try {
      payload = (await response.json()) as ClientActionResult<SubmitTaskClientData>;
    } catch {
      payload = null;
    }

    if (payload?.ok) {
      return { status: "success", data: payload.data };
    }

    if (response.status === 401) {
      return { status: "error", message: "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang." };
    }

    return {
      status: "error",
      message: payload?.error ?? "Đã có lỗi xảy ra. Vui lòng thử lại.",
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: "timeout_unknown", message: TIMEOUT_MESSAGE };
    }
    return {
      status: "error",
      message: "Không thể kết nối máy chủ. Vui lòng thử lại.",
    };
  } finally {
    window.clearTimeout(timer);
  }
}
type ClientActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

import {
  HEART_STATUS_COLORS,
  HEART_STATUS_LABELS,
  type HeartStatus,
} from "@/lib/customer/constants";

export function HeartStatusBadge({ status }: { status: HeartStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${HEART_STATUS_COLORS[status]}`}
    >
      {HEART_STATUS_LABELS[status]}
    </span>
  );
}

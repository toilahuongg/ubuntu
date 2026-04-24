"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteCustomerAction } from "@/app/(app)/customers/actions";

export function CustomerDeleteButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Xoá khách hàng này và toàn bộ lịch sử tương tác?",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    const result = await deleteCustomerAction(customerId);
    if (result.ok) {
      router.push("/customers");
      router.refresh();
      return;
    }
    setError(result.error);
    setIsDeleting(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isDeleting}
        onClick={handleDelete}
        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isDeleting ? "Đang xoá" : "Xoá"}
      </button>
      {error && <p className="max-w-40 text-right text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";

import { AdminSubHeader } from "app/(app)/admin/sub-header";
import { CosmeticForm } from "app/(app)/admin/cosmetics/cosmetic-form";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canAccessManagement(session)) throw redirect("/admin");

  return (
    <>
      <AdminSubHeader
        title="Thêm trang bị"
        description="Tạo trang bị mới cho người dùng"
      />
      <CosmeticForm initial={null} />
    </>
  );
}

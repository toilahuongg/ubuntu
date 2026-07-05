import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canManageShop } from "@/lib/permissions";

import { AdminSubHeader } from "../../sub-header";
import { CosmeticForm } from "../cosmetic-form";

export default async function NewCosmeticPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageShop(session)) redirect("/admin/cosmetics");

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

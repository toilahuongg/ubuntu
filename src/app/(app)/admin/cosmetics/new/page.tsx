import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";

import { AdminSubHeader } from "../../sub-header";
import { CosmeticForm } from "../cosmetic-form";

export default async function NewCosmeticPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessManagement(session)) redirect("/admin");

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

import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";

import { AdminSubHeader } from "../../sub-header";
import { CosmeticForm } from "../cosmetic-form";

export default async function NewCosmeticPage() {
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

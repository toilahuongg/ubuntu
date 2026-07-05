import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement, canManageShop } from "@/lib/permissions";
import { listAllCosmetics } from "@/lib/services/cosmetics-admin-service";
import { serializeCosmetic } from "@/lib/cosmetics/serialize";

import { AdminSubHeader } from "../sub-header";
import { CosmeticsManager } from "./cosmetics-manager";

export const dynamic = "force-dynamic";

export default async function AdminCosmeticsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessManagement(session)) redirect("/admin");

  const canEdit = canManageShop(session);
  const cosmetics = await listAllCosmetics();

  const serialized = cosmetics.map((c) => ({
    ...serializeCosmetic(c),
    description: c.description ?? "",
    cost: c.cost ?? null,
    unlockLevel: c.unlockLevel ?? null,
    active: c.active,
  }));

  return (
    <>
      <AdminSubHeader
        title={`Cửa hàng (${cosmetics.length})`}
        description="Quản lý vật phẩm, giá bán, trạng thái bán và cấp cho người dùng"
      />
      <CosmeticsManager cosmetics={serialized} canEdit={canEdit} />
    </>
  );
}

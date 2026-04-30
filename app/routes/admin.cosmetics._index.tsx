import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";
import { listAllCosmetics } from "@/lib/services/cosmetics-admin-service";
import { serializeCosmetic } from "@/lib/cosmetics/serialize";

import { AdminSubHeader } from "app/(app)/admin/sub-header";
import { CosmeticsManager } from "app/(app)/admin/cosmetics/cosmetics-manager";

export const dynamic = "force-dynamic";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canAccessManagement(session)) throw redirect("/admin");

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
        title={`Trang bị tên (${cosmetics.length})`}
        description="Tạo, chỉnh sửa, cấp trang bị cho người dùng"
      />
      <CosmeticsManager cosmetics={serialized} />
    </>
  );
}

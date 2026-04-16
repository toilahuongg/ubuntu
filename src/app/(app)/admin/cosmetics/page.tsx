import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";
import { listAllCosmetics } from "@/lib/services/cosmetics-admin-service";
import { serializeCosmetic } from "@/lib/cosmetics/serialize";

import { AdminSubHeader } from "../sub-header";
import { CosmeticsManager } from "./cosmetics-manager";

export const dynamic = "force-dynamic";

export default async function AdminCosmeticsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessManagement(session)) redirect("/admin");

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

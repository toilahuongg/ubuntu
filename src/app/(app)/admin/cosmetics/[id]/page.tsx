import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";

import { getSessionUser } from "@/lib/auth/session";
import { canManageShop } from "@/lib/permissions";
import { CosmeticModel, type CosmeticRecord } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { getAdminSnapshot } from "@/lib/services/organization-service";
import type { CosmeticSlot } from "@/lib/models";

import { AdminSubHeader } from "../../sub-header";
import { CosmeticForm } from "../cosmetic-form";
import { GrantCosmeticPanel } from "../grant-panel";

export default async function EditCosmeticPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageShop(session)) redirect("/admin/cosmetics");

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const cosmetic = (await CosmeticModel.findById(id).lean()) as
    | CosmeticRecord
    | null;
  if (!cosmetic) notFound();

  const snapshot = await getAdminSnapshot(session);
  const users = snapshot.users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
  }));

  const initial = {
    id: cosmetic._id.toString(),
    code: cosmetic.code,
    name: cosmetic.name,
    description: cosmetic.description ?? "",
    slot: cosmetic.slot as CosmeticSlot,
    rarity: cosmetic.rarity,
    icon: cosmetic.payload?.icon ?? null,
    cssClass: cosmetic.payload?.cssClass ?? null,
    gradient: cosmetic.payload?.gradient ?? null,
    cost: cosmetic.cost ?? null,
    unlockLevel: cosmetic.unlockLevel ?? null,
    active: cosmetic.active,
  };

  return (
    <>
      <AdminSubHeader
        title={`Sửa: ${cosmetic.name}`}
        description={cosmetic.code}
      />
      <CosmeticForm initial={initial} />
      <GrantCosmeticPanel
        cosmeticId={initial.id}
        cosmeticName={initial.name}
        users={users}
      />
    </>
  );
}

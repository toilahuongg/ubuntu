import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getInventory, listShop } from "@/lib/services/cosmetics-service";
import {
  serializeCosmetic,
  serializeEquipped,
} from "@/lib/cosmetics/serialize";
import { ShopClient } from "./shop-client";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [items, inventory] = await Promise.all([
    listShop(session.id),
    getInventory(session.id),
  ]);

  const equippedView = serializeEquipped(inventory.equipped);
  const ownedViews = inventory.owned.map(serializeCosmetic);

  return (
    <ShopClient
      fullName={session.fullName}
      initialItems={items}
      initialOwned={ownedViews}
      initialEquipped={equippedView}
      initialPointBalance={inventory.pointBalance}
    />
  );
}

import { getSessionUser } from "@/lib/auth/session";
import { getInventory } from "@/lib/services/cosmetics-service";
import { serializeCosmetic, serializeEquipped } from "@/lib/cosmetics/serialize";
import { methodNotAllowed, runApiHandler } from "./api._utils";

async function get() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  try {
    const inventory = await getInventory(session.id);
    return Response.json({
      pointBalance: inventory.pointBalance,
      equipped: serializeEquipped(inventory.equipped),
      owned: inventory.owned.map(serializeCosmetic),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export function loader({ request }: { request: Request }) { return runApiHandler(request, get); }
export function action() { return methodNotAllowed(); }

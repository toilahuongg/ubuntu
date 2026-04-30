import { redirect } from "react-router";
import { getSessionUser } from "@/lib/auth/session";
import { canManageCustomer } from "@/lib/permissions";
import { CustomerForm } from "@/components/customer/customer-form";
import { listAssignableCustomerCaregivers } from "@/lib/services/customer-service";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canManageCustomer(session)) throw redirect("/customers");
  const caregiverOptions = await listAssignableCustomerCaregivers(session);

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      <h1 className="mb-5 font-display text-lg font-bold tracking-tight">
        Tạo học viên mới
      </h1>
      <div className="glass-card p-4">
        <CustomerForm
          caregiverOptions={caregiverOptions}
          currentUserId={session.id}
        />
      </div>
    </div>
  );
}

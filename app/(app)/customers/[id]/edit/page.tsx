import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import {
  getCustomerById,
  listAssignableCustomerCaregivers,
} from "@/lib/services/customer-service";
import { canManageCustomer } from "@/lib/permissions";
import { CustomerForm } from "@/components/customer/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) throw redirect("/login");

  const customer = await getCustomerById(id, session);
  if (!canManageCustomer(session, customer)) throw redirect(`/customers/${id}`);
  const caregiverOptions = await listAssignableCustomerCaregivers(session);

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      <h1 className="mb-5 font-display text-lg font-bold tracking-tight">
        Chỉnh sửa học viên
      </h1>
      <div className="glass-card p-4">
        <CustomerForm
          caregiverOptions={caregiverOptions}
          currentUserId={session.id}
          initialData={customer}
        />
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "@/lib/revalidate";
import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import type { SessionUser } from "@/lib/domain";
import {
  customerInputSchema,
  customerInteractionInputSchema,
  updateCustomerInteractionInputSchema,
  updateCustomerInputSchema,
} from "@/lib/validation";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  type CustomerListFilters,
  type CustomerInput,
} from "@/lib/services/customer-service";
import {
  createInteraction,
  deleteInteraction,
  listInteractionsByCustomer,
  updateInteraction,
} from "@/lib/services/customer-interaction-service";

async function requireSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    throw redirect("/login");
  }
  return session;
}

export async function createCustomerAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = customerInputSchema.parse({
      name: formData.get("name") ?? "",
      ageBracket: formData.get("ageBracket") ?? "",
      gender: formData.get("gender") ?? "",
      occupation: formData.get("occupation") ?? "",
      personality: formData.get("personality") ?? "",
      heartStatus: (formData.get("heartStatus") as string) || undefined,
      notes: (formData.get("notes") as string) ?? "",
      caregiverIds: formData.getAll("caregiverIds").map(String),
      teamId: (formData.get("teamId") as string) || null,
      zoneId: (formData.get("zoneId") as string) || null,
      regionId: (formData.get("regionId") as string) || null,
    });

    const customer = await createCustomer(parsed, session);
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    return { id: customer.id };
  });
}

export async function updateCustomerAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = updateCustomerInputSchema.parse({
      customerId: formData.get("customerId") ?? "",
      name: formData.get("name") ?? "",
      ageBracket: formData.get("ageBracket") ?? "",
      gender: formData.get("gender") ?? "",
      occupation: formData.get("occupation") ?? "",
      personality: formData.get("personality") ?? "",
      heartStatus: (formData.get("heartStatus") as string) || undefined,
      notes: (formData.get("notes") as string) ?? "",
      caregiverIds: formData.getAll("caregiverIds").map(String),
      teamId: (formData.get("teamId") as string) || null,
      zoneId: (formData.get("zoneId") as string) || null,
      regionId: (formData.get("regionId") as string) || null,
    });

    const { customerId, ...rest } = parsed;
    const updateInput: Partial<CustomerInput> = { ...rest };
    if (!formData.has("caregiverIds")) delete updateInput.caregiverIds;
    if (!formData.has("teamId")) delete updateInput.teamId;
    if (!formData.has("zoneId")) delete updateInput.zoneId;
    if (!formData.has("regionId")) delete updateInput.regionId;
    await updateCustomer(customerId, updateInput, session);
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    revalidatePath(`/customers/${customerId}`);
  });
}

export async function deleteCustomerAction(
  customerId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    await deleteCustomer(customerId, session);
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    revalidatePath(`/customers/${customerId}`);
  });
}

export async function createInteractionAction(
  formData: FormData,
): Promise<ActionResult<{ interactionId: string; expAwarded: number; pointsAwarded: number; leveledUp: boolean; newLevel: number | null }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = customerInteractionInputSchema.parse({
      customerId: formData.get("customerId") ?? "",
      caregiverId: (formData.get("caregiverId") as string) || null,
      type: formData.get("type") ?? "",
      sharedContent: (formData.get("sharedContent") as string) || null,
      outcome: formData.get("outcome") ?? "",
      notes: (formData.get("notes") as string) ?? "",
      date: (formData.get("date") as string) || undefined,
    });

    const result = await createInteraction(
      {
        ...parsed,
        date: parsed.date ? new Date(parsed.date) : undefined,
      },
      session,
    );
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    revalidatePath(`/customers/${parsed.customerId}`);
    return {
      interactionId: result.interactionId,
      expAwarded: result.expAwarded,
      pointsAwarded: result.pointsAwarded,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
    };
  });
}

export async function listCustomersAction(
  filters?: CustomerListFilters,
): Promise<ActionResult<Awaited<ReturnType<typeof listCustomers>>>> {
  return runAction(async () => {
    const session = await requireSession();
    return listCustomers(session, filters);
  });
}

export async function updateInteractionAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = updateCustomerInteractionInputSchema.parse({
      interactionId: formData.get("interactionId") ?? "",
      customerId: formData.get("customerId") ?? "",
      caregiverId: (formData.get("caregiverId") as string) || null,
      type: formData.get("type") ?? "",
      sharedContent: (formData.get("sharedContent") as string) || null,
      outcome: formData.get("outcome") ?? "",
      notes: (formData.get("notes") as string) ?? "",
      date: (formData.get("date") as string) || undefined,
    });

    await updateInteraction(
      parsed.interactionId,
      {
        date: parsed.date ? new Date(parsed.date) : undefined,
        caregiverId: parsed.caregiverId,
        notes: parsed.notes,
        outcome: parsed.outcome,
        sharedContent: parsed.sharedContent,
        type: parsed.type,
      },
      session,
    );
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    revalidatePath(`/customers/${parsed.customerId}`);
  });
}

export async function deleteInteractionAction(
  interactionId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const result = await deleteInteraction(interactionId, session);
    revalidatePath("/customers");
    revalidatePath("/customers/dashboard");
    revalidatePath(`/customers/${result.customerId}`);
  });
}

export async function getCustomerDetailAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCustomerById>>>> {
  return runAction(async () => {
    const session = await requireSession();
    return getCustomerById(customerId, session);
  });
}

export async function listInteractionsAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof listInteractionsByCustomer>>>> {
  return runAction(async () => {
    const session = await requireSession();
    return listInteractionsByCustomer(customerId, session);
  });
}

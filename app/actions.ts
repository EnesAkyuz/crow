"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
});

const inviteSchema = z.object({
  email: z.string().email(),
  tenantId: z.string().uuid(),
});

const deleteInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const validated = schema.safeParse({ name });

  if (!validated.success) {
    return { error: "Invalid name" };
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ name: validated.data.name })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, data };
}

export async function createTenant(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const orgId = formData.get("orgId") as string;

  const validated = schema.safeParse({ name });

  if (!validated.success || !orgId) {
    return { error: "Invalid input" };
  }

  const { data, error } = await supabase
    .from("tenants")
    .insert({
      name: validated.data.name,
      organization_id: orgId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, data };
}

export async function inviteUserToTenant(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const tenantId = formData.get("tenantId") as string;

  const validated = inviteSchema.safeParse({ email, tenantId });

  if (!validated.success) {
    return { error: "Invalid email or tenant ID" };
  }

  const { error } = await supabase.from("tenant_invites").insert({
    email: validated.data.email,
    tenant_id: validated.data.tenantId,
    invited_by: (await supabase.auth.getUser()).data.user?.id,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique violation
      return { error: "User already invited" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTenantInvite(formData: FormData) {
  const supabase = await createClient();

  const inviteId = formData.get("inviteId") as string;
  const validated = deleteInviteSchema.safeParse({ inviteId });

  if (!validated.success) {
    return { error: "Invalid invite ID" };
  }

  const { error } = await supabase
    .from("tenant_invites")
    .delete()
    .eq("id", validated.data.inviteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

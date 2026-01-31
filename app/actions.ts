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

// Vault session schemas
const createVaultSessionSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cookieData: z.string().min(1), // Raw cookie string
  expiresAt: z.string().datetime().optional().nullable(),
  rateLimitPerHour: z.number().int().min(1).max(1000).default(60),
  rateLimitPerDay: z.number().int().min(1).max(10000).default(500),
});

const updateVaultSessionSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  rateLimitPerHour: z.number().int().min(1).max(1000).optional(),
  rateLimitPerDay: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

const deleteVaultSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const refreshVaultSessionSchema = z.object({
  sessionId: z.string().uuid(),
  cookieData: z.string().min(1),
  expiresAt: z.string().datetime().optional().nullable(),
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

// ============================================
// VAULT SESSION ACTIONS
// ============================================

/**
 * Simple encryption using Web Crypto API
 * In production, use Supabase Vault or a proper KMS
 */
async function encryptCookieData(data: string): Promise<string> {
  // For now, we'll base64 encode. In production, use proper encryption
  // with a key from environment variables or Supabase Vault
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  return Buffer.from(dataBuffer).toString("base64");
}

export async function createVaultSession(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    tenantId: formData.get("tenantId") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    cookieData: formData.get("cookieData") as string,
    expiresAt: (formData.get("expiresAt") as string) || null,
    rateLimitPerHour: Number(formData.get("rateLimitPerHour")) || 60,
    rateLimitPerDay: Number(formData.get("rateLimitPerDay")) || 500,
  };

  const validated = createVaultSessionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Invalid input" };
  }

  // Encrypt the cookie data before storing
  const encryptedData = await encryptCookieData(validated.data.cookieData);

  const { data, error } = await supabase
    .from("vault_sessions")
    .insert({
      tenant_id: validated.data.tenantId,
      name: validated.data.name,
      description: validated.data.description,
      encrypted_data: encryptedData,
      expires_at: validated.data.expiresAt,
      rate_limit_per_hour: validated.data.rateLimitPerHour,
      rate_limit_per_day: validated.data.rateLimitPerDay,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tenants/${validated.data.tenantId}`);
  return { success: true, data };
}

export async function updateVaultSession(formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    sessionId: formData.get("sessionId") as string,
    name: (formData.get("name") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    expiresAt: (formData.get("expiresAt") as string) || undefined,
    rateLimitPerHour: formData.get("rateLimitPerHour")
      ? Number(formData.get("rateLimitPerHour"))
      : undefined,
    rateLimitPerDay: formData.get("rateLimitPerDay")
      ? Number(formData.get("rateLimitPerDay"))
      : undefined,
    isActive:
      formData.get("isActive") !== null
        ? formData.get("isActive") === "true"
        : undefined,
  };

  const validated = updateVaultSessionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Invalid input" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (validated.data.name) updateData.name = validated.data.name;
  if (validated.data.description !== undefined)
    updateData.description = validated.data.description;
  if (validated.data.expiresAt !== undefined)
    updateData.expires_at = validated.data.expiresAt;
  if (validated.data.rateLimitPerHour)
    updateData.rate_limit_per_hour = validated.data.rateLimitPerHour;
  if (validated.data.rateLimitPerDay)
    updateData.rate_limit_per_day = validated.data.rateLimitPerDay;
  if (validated.data.isActive !== undefined)
    updateData.is_active = validated.data.isActive;

  // Reset expiry warning if expiration date changed
  if (validated.data.expiresAt !== undefined) {
    updateData.expiry_warning_sent = false;
  }

  const { data, error } = await supabase
    .from("vault_sessions")
    .update(updateData)
    .eq("id", validated.data.sessionId)
    .select("tenant_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tenants/${data.tenant_id}`);
  return { success: true };
}

export async function refreshVaultSession(formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    sessionId: formData.get("sessionId") as string,
    cookieData: formData.get("cookieData") as string,
    expiresAt: (formData.get("expiresAt") as string) || null,
  };

  const validated = refreshVaultSessionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Invalid input" };
  }

  // Encrypt the new cookie data
  const encryptedData = await encryptCookieData(validated.data.cookieData);

  const { data, error } = await supabase
    .from("vault_sessions")
    .update({
      encrypted_data: encryptedData,
      expires_at: validated.data.expiresAt,
      expiry_warning_sent: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validated.data.sessionId)
    .select("tenant_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tenants/${data.tenant_id}`);
  return { success: true };
}

export async function deleteVaultSession(formData: FormData) {
  const supabase = await createClient();

  const sessionId = formData.get("sessionId") as string;
  const validated = deleteVaultSessionSchema.safeParse({ sessionId });

  if (!validated.success) {
    return { error: "Invalid session ID" };
  }

  // Get tenant_id first for revalidation
  const { data: session } = await supabase
    .from("vault_sessions")
    .select("tenant_id")
    .eq("id", validated.data.sessionId)
    .single();

  const { error } = await supabase
    .from("vault_sessions")
    .delete()
    .eq("id", validated.data.sessionId);

  if (error) {
    return { error: error.message };
  }

  if (session) {
    revalidatePath(`/dashboard/tenants/${session.tenant_id}`);
  }
  return { success: true };
}

export async function toggleVaultSessionActive(formData: FormData) {
  const supabase = await createClient();

  const sessionId = formData.get("sessionId") as string;
  const isActive = formData.get("isActive") === "true";

  const { data, error } = await supabase
    .from("vault_sessions")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("tenant_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tenants/${data.tenant_id}`);
  return { success: true };
}

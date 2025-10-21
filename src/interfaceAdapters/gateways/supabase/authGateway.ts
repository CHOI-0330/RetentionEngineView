import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { AuthPort } from "../../../application/entitle/ports";
import type { User } from "../../../domain/core";

interface SupabaseRegisterResult {
  userId: string;
}

const toError = (value: unknown, fallbackMessage: string): Error => {
  if (value instanceof Error) {
    return value;
  }
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return new Error(message);
    }
  }
  return new Error(fallbackMessage);
};

export class SupabaseAuthGateway implements AuthPort {
  private serviceClient: SupabaseClient | null = null;
  private anonClient: SupabaseClient | null = null;

  private getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      this.serviceClient = createServerSupabaseClient();
    }
    return this.serviceClient;
  }

  private getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        throw new Error("Supabase anon client is not configured.");
      }
      this.anonClient = createClient(url, anonKey);
    }
    return this.anonClient;
  }

  // Grabs the user's role using the service client so other methods can stay small.
  private async fetchUserRole(userId: string): Promise<User["role"]> {
    const { data, error } = await this.getServiceClient()
      .from("user")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error || !data) {
      throw toError(error, "User profile not found.");
    }
    return (data as { role: User["role"] }).role;
  }

  async getUserProfile(userId: string): Promise<{ role: User["role"]; displayName: string }>{
    const { data, error } = await this.getServiceClient()
      .from("user")
      .select("role, display_name")
      .eq("user_id", userId)
      .single();
    if (error || !data) {
      throw toError(error, "User profile not found.");
    }
    const record = data as { role: User["role"]; display_name: string };
    return { role: record.role, displayName: record.display_name };
  }

  async registerUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: User["role"];
  }): Promise<SupabaseRegisterResult> {
    const adminClient = this.getServiceClient();
    const { data, error } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw toError(error, "Failed to create Supabase auth user.");
    }

    const userId = data.user.id;

    const { error: insertError } = await adminClient.from("user").insert({
      user_id: userId,
      display_name: input.displayName,
      email: input.email,
      role: input.role,
    });
    if (insertError) {
      throw toError(insertError, "Failed to persist user profile.");
    }

    return { userId };
  }

  async loginUser(input: { email: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }> {
    const anonClient = this.getAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      throw toError(error, "Failed to sign in.");
    }

    const role = await this.fetchUserRole(data.user.id);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      role,
    };
  }

  async refreshSession(input: { refreshToken: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }> {
    // The anon client is enough to refresh a session as long as we provide the refresh token.
    const anonClient = this.getAnonClient();
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: input.refreshToken,
    });
    if (error || !data.session || !data.user) {
      throw toError(error, "Failed to refresh session.");
    }

    const role = await this.fetchUserRole(data.user.id);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      role,
    };
  }

  async logoutUser(input: { accessToken: string }): Promise<void> {
    const { error } = await this.getServiceClient().auth.admin.signOut(input.accessToken, "global");
    if (error) {
      throw toError(error, "Failed to sign out.");
    }
  }

  async getUserFromAccessToken(accessToken: string): Promise<{ userId: string; role: User["role"] }> {
    const { data, error } = await this.getServiceClient().auth.getUser(accessToken);
    if (error || !data.user) {
      throw toError(error, "Invalid access token.");
    }
    const role = await this.fetchUserRole(data.user.id);
    return { userId: data.user.id, role };
  }
}

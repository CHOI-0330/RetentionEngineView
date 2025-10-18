import { createClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { AuthPort } from "../../../application/entitle/ports";
import type { User } from "../../../type/core";

interface SupabaseRegisterResult {
  userId: string;
}

export class SupabaseAuthGateway implements AuthPort {
  private readonly serviceClient = createServerSupabaseClient();
  private readonly anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Grabs the user's role using the service client so other methods can stay small.
  private async fetchUserRole(userId: string): Promise<User["role"]> {
    const { data, error } = await this.serviceClient
      .from("user")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error || !data) {
      throw error ?? new Error("User profile not found.");
    }
    return (data as { role: User["role"] }).role;
  }

  async registerUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: User["role"];
  }): Promise<SupabaseRegisterResult> {
    const adminClient = this.serviceClient;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw error ?? new Error("Failed to create Supabase auth user.");
    }

    const userId = data.user.id;

    const { error: insertError } = await adminClient.from("user").insert({
      user_id: userId,
      display_name: input.displayName,
      email: input.email,
      role: input.role,
    });
    if (insertError) {
      throw insertError;
    }

    return { userId };
  }

  async loginUser(input: { email: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }> {
    const { data, error } = await this.anonClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      throw error ?? new Error("Failed to sign in.");
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
    const { data, error } = await this.anonClient.auth.refreshSession({
      refresh_token: input.refreshToken,
    });
    if (error || !data.session || !data.user) {
      throw error ?? new Error("Failed to refresh session.");
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
    const { error } = await this.serviceClient.auth.admin.signOut(input.accessToken, "global");
    if (error) {
      throw error;
    }
  }

  async getUserFromAccessToken(accessToken: string): Promise<{ userId: string; role: User["role"] }> {
    const { data, error } = await this.serviceClient.auth.getUser(accessToken);
    if (error || !data.user) {
      throw error ?? new Error("Invalid access token.");
    }
    const role = await this.fetchUserRole(data.user.id);
    return { userId: data.user.id, role };
  }
}

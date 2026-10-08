"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export type AuthFormState = { error?: string } | null;

export async function authenticate(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const mode = formData.get("mode");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (mode !== "signup" && mode !== "signin") {
    return { error: "Choose whether to sign in or create an account." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const emailRedirectTo = new URL(
      "/auth/callback?next=/",
      siteUrl,
    ).toString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) return { error: error.message };
    if (data.session) redirect("/");
    redirect("/login?checkEmail=1");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase sign-out failed:", error.message);
    throw new Error("Could not sign out. Please try again.");
  }
  redirect("/login");
}

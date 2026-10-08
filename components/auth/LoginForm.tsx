"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthFormState } from "../../app/actions/auth";

export default function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    authenticate,
    null,
  );

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-stone-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#b88d45] focus:ring-2 focus:ring-[#b88d45]/15"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-stone-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={8}
          required
          placeholder="At least 8 characters"
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#b88d45] focus:ring-2 focus:ring-[#b88d45]/15"
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#1d1d19] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#33322d] disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>
      <p className="pt-1 text-center text-sm text-stone-500">
        {mode === "signin" ? "New to CodeOutLoud?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode((current) => current === "signin" ? "signup" : "signin")}
          className="font-semibold text-[#80602c] hover:text-[#5e451f]"
        >
          {mode === "signin" ? "Create account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}

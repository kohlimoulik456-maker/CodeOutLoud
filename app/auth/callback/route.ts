import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../utils/supabase/server";

function getSafeNextPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Supabase auth callback failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  return NextResponse.redirect(
    new URL(
      getSafeNextPath(request.nextUrl.searchParams.get("next")),
      request.url,
    ),
  );
}

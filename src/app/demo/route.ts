import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const as = req.nextUrl.searchParams.get("as") || "dev";
  const safe = as.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "dev";
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("demo_user", safe, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}

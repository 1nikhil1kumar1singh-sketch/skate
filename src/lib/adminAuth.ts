import { NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest) {
  const key = process.env.ADMIN_KEY?.trim();
  if (!key) return false;
  const header = req.headers.get("x-admin-key")?.trim();
  const query = req.nextUrl.searchParams.get("key")?.trim();
  return header === key || query === key;
}

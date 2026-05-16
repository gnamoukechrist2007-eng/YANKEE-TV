import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { iptvCredentials } from "@/server/db/schema";

const ALLOWED_ORIGINS = new Set([
  "https://mlb.thorsteinson.com",
  "https://tv.thorsteinson.com",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "vary": "origin",
    };
  }
  return { vary: "origin" };
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { authenticated: false, email: null, has_creds: false },
      { headers: corsHeaders(origin) },
    );
  }
  const credsRow = await db
    .select({ userId: iptvCredentials.userId })
    .from(iptvCredentials)
    .where(eq(iptvCredentials.userId, userId))
    .limit(1);
  return NextResponse.json(
    {
      authenticated: true,
      email: session?.user?.email ?? null,
      has_creds: credsRow.length > 0,
    },
    { headers: corsHeaders(origin) },
  );
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(req.headers.get("origin")),
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

import { auth } from "@/auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}

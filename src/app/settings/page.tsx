import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { iptvCredentials } from "@/server/db/schema";
import { encrypt } from "@/server/lib/crypto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function saveCreds(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("unauthorized");

  const serverUrl = String(formData.get("server_url") ?? "")
    .trim()
    .replace(/\/+$/, "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!serverUrl || !username || !password) return;
  if (!/^https?:\/\//i.test(serverUrl)) return;

  const { ciphertext, iv, tag } = encrypt(password);
  await db
    .insert(iptvCredentials)
    .values({
      userId,
      serverUrl,
      username,
      passwordEncrypted: ciphertext,
      iv,
      tag,
    })
    .onConflictDoUpdate({
      target: iptvCredentials.userId,
      set: {
        serverUrl,
        username,
        passwordEncrypted: ciphertext,
        iv,
        tag,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/");
  redirect("/");
}

export default async function Settings() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const rows = await db
    .select()
    .from(iptvCredentials)
    .where(eq(iptvCredentials.userId, userId))
    .limit(1);
  const existing = rows[0];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <h1 className="text-xl font-semibold">IPTV provider credentials</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Xtream Codes server URL and account. Stored encrypted at rest.
          </p>
        </header>

        <form action={saveCreds} className="space-y-4">
          <label className="block">
            <span className="text-xs text-neutral-400">Server URL</span>
            <input
              name="server_url"
              type="url"
              required
              placeholder="https://provider.example.com:8080"
              defaultValue={existing?.serverUrl ?? ""}
              className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
            />
          </label>

          <label className="block">
            <span className="text-xs text-neutral-400">Username</span>
            <input
              name="username"
              type="text"
              required
              autoComplete="off"
              defaultValue={existing?.username ?? ""}
              className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
            />
          </label>

          <label className="block">
            <span className="text-xs text-neutral-400">
              Password {existing ? "(leave blank to keep existing)" : ""}
            </span>
            <input
              name="password"
              type="password"
              required={!existing}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-white text-black px-4 py-2 text-sm font-medium hover:bg-neutral-200 transition"
          >
            Save & continue
          </button>
        </form>
      </div>
    </main>
  );
}

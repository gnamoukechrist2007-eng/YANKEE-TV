import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadDecryptedCreds } from "@/server/lib/load-creds";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const creds = await loadDecryptedCreds(userId);
  if (!creds) redirect("/settings");

  return (
    <iframe
      title="player"
      src="/play"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      allow="autoplay; fullscreen; encrypted-media"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: 0,
      }}
    />
  );
}

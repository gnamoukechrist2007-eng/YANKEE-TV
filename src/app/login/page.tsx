import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">TV — thorsteinson.com</h1>
          <p className="text-sm text-neutral-400 mt-1">Sign in to continue</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-neutral-200 transition"
          >
            Sign in with Google
          </button>
        </form>
        <p className="text-xs text-neutral-500">
          Access restricted to invited accounts.
        </p>
      </div>
    </main>
  );
}

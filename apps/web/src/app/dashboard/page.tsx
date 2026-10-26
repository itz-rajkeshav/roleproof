import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { authClient } from "@/lib/auth-client";

export default async function DashboardPage() {
  const { data: session } = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session.user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your interviews will show up here.</p>
      </main>
    </div>
  );
}

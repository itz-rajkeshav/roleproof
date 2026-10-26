"use client";

import Link from "next/link";

import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="relative z-10 mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
      <Logo />
      {!isPending && (
        <Link
          href={session ? "/dashboard" : "/login"}
          className="rounded-full border border-foreground/20 px-4 py-1.5 text-sm transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          {session ? "Dashboard" : "Sign in"}
        </Link>
      )}
    </header>
  );
}

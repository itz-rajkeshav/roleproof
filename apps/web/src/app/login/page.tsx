import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      {/* Same mauve disc and orbiting terracotta dot as the landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-40 size-[34rem] sm:-right-24"
      >
        <div className="size-full rounded-full bg-card/70" />
        <div className="orbit absolute inset-0">
          <div className="absolute top-0 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta" />
        </div>
        <div className="absolute inset-[18%] rounded-full border border-plum/15" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-card/50" />

      <header className="relative mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <AuthForm />
      </main>
    </div>
  );
}

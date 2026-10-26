"use client";

import { Input } from "@roleproof/ui/components/input";
import { Label } from "@roleproof/ui/components/label";
import { cn } from "@roleproof/ui/lib/utils";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const fieldClass =
  "h-11 rounded-full border-plum/20 bg-background/50 px-4 text-sm md:text-sm focus-visible:border-plum focus-visible:ring-plum/20";

export function AuthForm() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setSubmitting(true);
    const { error } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border bg-card/80 p-8 shadow-[0_24px_60px_-30px_rgb(58_15_52/0.45)] backdrop-blur sm:p-10">
        <h1 className="font-serif text-4xl tracking-tight">
          {mode === "sign-in" ? (
            <>
              Welcome <em className="text-brand-ink">back.</em>
            </>
          ) : (
            <>
              Let's get you <em className="text-brand-ink">ready.</em>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "sign-in"
            ? "Sign in to continue your interview prep."
            : "Create an account to start practicing interviews."}
        </p>

        <div role="tablist" className="mt-8 grid grid-cols-2 rounded-full border border-plum/20 p-1">
          {(["sign-in", "sign-up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full py-2 text-sm transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "sign-in" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          {mode === "sign-up" && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <Label htmlFor="name" className="pl-4 text-sm">
                Name
              </Label>
              <Input id="name" name="name" autoComplete="name" placeholder="Your name" required className={fieldClass} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="pl-4 text-sm">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="pl-4 text-sm">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder={mode === "sign-in" ? "Your password" : "At least 8 characters"}
                minLength={8}
                required
                className={cn(fieldClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <>
                {mode === "sign-in" ? "Sign in" : "Create account"}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? "New to RoleProof? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="text-foreground underline decoration-terracotta decoration-2 underline-offset-4"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

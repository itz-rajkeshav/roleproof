"use client";

import { Button } from "@roleproof/ui/components/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.push("/") },
        })
      }
    >
      <LogOut />
      Sign out
    </Button>
  );
}

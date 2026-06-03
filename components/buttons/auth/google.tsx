"use client";

import { useAuthActions } from "@convex-dev/auth/react";

import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 5.04c1.69 0 2.84.73 3.49 1.34l2.55-2.49C16.48 2.44 14.45 1.56 12 1.56 8.47 1.56 5.42 3.58 3.94 6.53l2.96 2.3C7.6 6.68 9.6 5.04 12 5.04Z" />
      <path fill="#4285F4" d="M22.08 12.25c0-.75-.07-1.47-.19-2.16H12v4.09h5.65a4.83 4.83 0 0 1-2.1 3.17l3.24 2.51c1.89-1.74 2.99-4.3 2.99-7.33Z" />
      <path fill="#FBBC05" d="M6.91 14.84A7.17 7.17 0 0 1 6.53 12c0-.98.17-1.92.47-2.79L4.03 6.91A10.44 10.44 0 0 0 2.9 12c0 1.83.44 3.56 1.22 5.09l2.79-2.25Z" />
      <path fill="#34A853" d="M12 22.44c2.45 0 4.51-.81 6.01-2.2l-2.86-2.22c-.79.53-1.8.84-3.15.84-2.4 0-4.42-1.62-5.14-3.8l-2.94 2.27C5.39 20.32 8.45 22.44 12 22.44Z" />
    </svg>
  );
}

export function GoogleButton() {
  const { signIn } = useAuthActions();

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 text-xs"
      onClick={() => void signIn("google")}
    >
      <GoogleMark />
      Google
    </Button>
  );
}

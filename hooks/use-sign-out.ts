"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

export function useSignOut() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      await signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSignOut, isLoading };
}
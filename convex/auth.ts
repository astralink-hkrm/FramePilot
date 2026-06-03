import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      validatePasswordRequirements(password) {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
      },
    }),
  ],
});


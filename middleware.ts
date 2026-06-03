import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

import {
  isBypassRoute,
  isProtectedRoute,
  isPublicRoute,
} from "@/lib/permissions";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.");
}

const bypassMatcher = createRouteMatcher(isBypassRoute);
const publicMatcher = createRouteMatcher(isPublicRoute);
const protectedMatcher = createRouteMatcher(isProtectedRoute);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (bypassMatcher(request)) {
      return;
    }

    const isAuthenticated = await convexAuth.isAuthenticated();

    if (isAuthenticated && publicMatcher(request)) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }

    if (!isAuthenticated && protectedMatcher(request)) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }
  },
  {
    convexUrl,
    cookieConfig: {
      maxAge: 60 * 60 * 24 * 30,
    },
  }
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/api/auth(.*)"],
};